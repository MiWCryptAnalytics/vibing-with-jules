import json
import os
import subprocess
import base64
from google.cloud import aiplatform
from google.api_core.exceptions import GoogleAPIError

def load_npc_data(filepath):
  """
  Loads NPC data from a JSON file.

  Args:
    filepath: The path to the JSON file.

  Returns:
    A list of NPC objects if successful, None otherwise.
  """
  try:
    with open(filepath, 'r') as f:
      data = json.load(f)
    return data
  except FileNotFoundError:
    print(f"Error: File not found at {filepath}")
    return None
  except json.JSONDecodeError:
    print(f"Error: Could not parse JSON data from {filepath}")
    return None

def load_dialogue_data(filepath):
  """
  Loads dialogue data from a JSON file.

  Args:
    filepath: The path to the JSON file.

  Returns:
    A dictionary of dialogue objects if successful, None otherwise.
  """
  try:
    with open(filepath, 'r') as f:
      data = json.load(f)
    return data
  except FileNotFoundError:
    print(f"Error: File not found at {filepath}")
    return None
  except json.JSONDecodeError:
    print(f"Error: Could not parse JSON data from {filepath}")
    return None

if __name__ == "__main__":
  # Assuming the script is in 'scripts' and npcs.json is in 'www/data'
  npcs_filepath = "../www/data/npcs.json"
  dialogues_filepath = "../www/data/dialogues.json"

  npc_data = load_npc_data(npcs_filepath)
  dialogue_data = load_dialogue_data(dialogues_filepath)

  if npc_data:
    print(f"Successfully loaded {len(npc_data)} NPCs.")
    if npc_data: # Check if npc_data is not empty
        print(f"The first NPC is: {npc_data[0].get('name', 'N/A')}")

  if dialogue_data:
    print(f"Successfully loaded dialogues for {len(dialogue_data)} NPCs.")

  project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
  vertex_ai_region = os.getenv("VERTEX_AI_REGION")

  if not project_id:
    print("ERROR: GOOGLE_CLOUD_PROJECT environment variable not set. Please set it before running the script.")
  if not vertex_ai_region:
    print("ERROR: VERTEX_AI_REGION environment variable not set. Please set it before running the script (e.g., 'us-central1').")

  if not project_id or not vertex_ai_region:
    # Attempt to load data even if env vars are missing, to allow other parts of the script to function if needed
    if npc_data is None:
        print("Could not load NPC data.")
    if dialogue_data is None:
        print("Could not load dialogue data.")
    if npc_data and dialogue_data:
         print("NPC and Dialogue data loaded, but skipping portrait generation due to missing environment variables.")
    return # Exit main if env vars are missing

  if npc_data and dialogue_data:
    updated_npcs = generate_portraits_for_npcs(npc_data, dialogue_data, project_id, vertex_ai_region)
    print("Finished processing NPCs.")
    if updated_npcs and len(updated_npcs) > 0 and updated_npcs[0].get('portraitImage'):
        print(f"DEBUG: First NPC's updated portrait path: {updated_npcs[0].get('portraitImage')}")
    elif updated_npcs and len(updated_npcs) > 0:
        print(f"DEBUG: First NPC processed, but portraitImage might not have been updated (e.g. API error). Original name: {updated_npcs[0].get('name')}")

  elif not npc_data:
    print("Could not load NPC data. Skipping portrait generation.")
  elif not dialogue_data:
    print("Could not load dialogue data. Skipping portrait generation.")

  if 'updated_npcs' in locals() and updated_npcs:
    npcs_file_to_save = "../www/data/npcs.json"
    if save_npc_data(npcs_file_to_save, updated_npcs):
      print(f"NPC data with updated portrait paths saved to {npcs_file_to_save}")
    else:
      print(f"Failed to save updated NPC data to {npcs_file_to_save}")
  elif 'npc_data' in locals() and npc_data and ('dialogue_data' not in locals() or not dialogue_data): # NPC data loaded, but not dialogue
      print("NPC data was loaded, but dialogue data was not. No portraits generated, so not saving NPC data.")
  elif project_id and vertex_ai_region and ('npc_data' not in locals() or not npc_data): # Env vars set, but no NPC data
      print("Project and region configured, but no NPC data loaded. Not saving.")
  else:
    if not project_id or not vertex_ai_region:
        print("Skipping saving NPC data due to missing GOOGLE_CLOUD_PROJECT or VERTEX_AI_REGION variables.")
    else:
        print("No updated NPC data to save (e.g., initial data loading might have failed or no NPCs processed).")

def save_npc_data(filepath, npc_data_list):
  """
  Saves the list of NPC data to a JSON file.

  Args:
    filepath: The path to the JSON file.
    npc_data_list: The list of NPC objects to save.

  Returns:
    True if saving was successful, False otherwise.
  """
  try:
    with open(filepath, 'w') as f:
      json.dump(npc_data_list, f, indent=2)
    print(f"Successfully saved updated NPC data to {filepath}")
    return True
  except IOError as e:
    print(f"ERROR: Could not write NPC data to {filepath}. Error: {e}")
    return False
  except Exception as e: # Catch any other potential errors during save
    print(f"ERROR: An unexpected error occurred while saving NPC data to {filepath}. Error: {e}")
    return False

def generate_portraits_for_npcs(npcs_data_list, all_dialogues_dict, project_id, vertex_ai_region):
  """
  Generates portraits for NPCs using Vertex AI Imagen.
  """
  updated_npcs_data_list = []
  portraits_dir = "../www/assets/images/portraits/"
  os.makedirs(portraits_dir, exist_ok=True)

  try:
    aiplatform.init(project=project_id, location=vertex_ai_region)
    # Using a slightly older but generally available model version for wider compatibility.
    # If "imagegeneration@006" is confirmed available and preferred, it can be used.
    # For now, using "imagegeneration@005" as it's broadly available.
    model = aiplatform.ImageGenerationModel.from_pretrained("imagegeneration@005")
  except Exception as e:
    print(f"ERROR: Failed to initialize Vertex AI or load model: {e}")
    print("Ensure GOOGLE_CLOUD_PROJECT and VERTEX_AI_REGION are correctly set and you have authenticated with GCP.")
    # Return original list if AI platform init fails
    return [npc.copy() for npc in npcs_data_list]

  for npc in npcs_data_list:
    npc_copy = npc.copy() # Work with a copy
    npc_id = npc_copy.get('id', 'unknown_id')
    npc_name = npc_copy.get('name', 'Unknown Name')
    npc_description = npc_copy.get('description', 'No description available.')

    # Base prompt
    prompt_text = f"Portrait of {npc_name}: {npc_description}."

    # Add style cue
    prompt_text += " Pirate character portrait, fantasy art, detailed illustration style."

    # Attempt to add dialogue to prompt
    npc_dialogues = all_dialogues_dict.get(npc_id)
    if npc_dialogues and isinstance(npc_dialogues, list) and len(npc_dialogues) > 0:
        # Look for the first 'npcText' in the dialogue entries
        dialogue_line_1 = None
        for entry in npc_dialogues:
            if 'npcText' in entry and entry['npcText']:
                dialogue_line_1 = entry['npcText']
                break
        if dialogue_line_1:
            prompt_text += f" They might say: '{dialogue_line_1}'"

        # Attempt to get a second dialogue line if available
        dialogue_line_2 = None
        count = 0
        for entry in npc_dialogues:
            if 'npcText' in entry and entry['npcText']:
                count += 1
                if count == 2:
                    dialogue_line_2 = entry['npcText']
                    break
        if dialogue_line_2:
            prompt_text += f" Another thing they might say is: '{dialogue_line_2}'"

    print(f"INFO: Generating image for {npc_id} with prompt: {prompt_text}")

    image_filename = f"{npc_id}_portrait.png"
    full_image_path = os.path.join(portraits_dir, image_filename)

    try:
        response = model.generate_images(
            prompt=prompt_text,
            number_of_images=1,
            aspect_ratio="1:1", # Square
            # For models like imagegeneration@005, explicit size parameters might not be available
            # or might be handled differently (e.g. via generation_parameters in some SDK versions)
            # The default is often 1024x1024, but smaller might be implicitly chosen by API for speed/cost.
            # If specific sizing like 512x512 is critical and available, add the parameter here.
            # e.g. seed=12345 # for reproducibility if needed
        )

        if response and response.images:
            # Assuming response.images[0]._image_bytes is the way to get base64 encoded bytes
            # This can vary slightly by SDK version. If it's raw bytes, no b64decode needed.
            # If it's a base64 string, then decode.
            # Based on common usage, _image_bytes from Vertex AI SDK is often raw bytes already.
            # Let's assume it's base64 encoded string for now as per plan, and adjust if testing shows otherwise.
            generated_image_data = response.images[0]._image_bytes # This might be base64 string or raw bytes

            image_bytes_to_save = None
            if isinstance(generated_image_data, str):
                # If it's a string, it's likely base64 encoded
                image_bytes_to_save = base64.b64decode(generated_image_data)
            elif isinstance(generated_image_data, bytes):
                # If it's already bytes, use directly
                image_bytes_to_save = generated_image_data
            else:
                print(f"ERROR: Image data for {npc_id} is in an unexpected format: {type(generated_image_data)}")
                updated_npcs_data_list.append(npc_copy) # Add original copy back
                continue


            with open(full_image_path, "wb") as f:
                f.write(image_bytes_to_save)

            print(f"SUCCESS: Generated and saved portrait for {npc_id} to {full_image_path}")

            new_portrait_image_path = f"assets/images/portraits/{image_filename}"
            npc_copy['portraitImage'] = new_portrait_image_path
            print(f"DEBUG: NPC {npc_id} portraitImage updated to: {new_portrait_image_path}")

        elif response:
             print(f"ERROR: Imagen API call succeeded for {npc_id} but returned no images in attribute response.images. Response: {response}")
        else:
            print(f"ERROR: Imagen API call for {npc_id} returned a None or empty response.")

    except GoogleAPIError as e:
        print(f"ERROR: Failed to generate image for {npc_id} due to Google API Error. Error: {e}")
    except ImportError:
        print("ERROR: google-cloud-aiplatform library is not installed. Please install it using 'pip install google-cloud-aiplatform'")
        # If this happens, we can't continue generating images, so we return what we have so far.
        # Add remaining NPCs as original to the list
        current_npc_index = npcs_data_list.index(npc) # Find current NPC to add remaining ones
        for i in range(current_npc_index, len(npcs_data_list)):
            updated_npcs_data_list.append(npcs_data_list[i].copy())
        return updated_npcs_data_list
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while generating image for {npc_id}. Error: {e}")

    updated_npcs_data_list.append(npc_copy) # Add npc_copy (modified or not)

  return updated_npcs_data_list
