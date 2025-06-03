import json
import os
# subprocess was not used
# base64 is not needed for Gemini raw image bytes
# from google.cloud import aiplatform # Replaced with google.generativeai
from google.api_core.exceptions import GoogleAPIError

# New imports for Gemini API
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

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

def main():
  """
  Main function to load NPC and dialogue data, generate portraits, and save updated data.
  """
  # File paths
  base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Assuming script is in 'scripts' dir
  npcs_filepath = os.path.join(base_path, "www", "data", "npcs.json")
  dialogues_filepath = os.path.join(base_path, "www", "data", "dialogues.json")
  npcs_file_to_save = npcs_filepath # Save back to the same file

  # Load data
  npc_data = load_npc_data(npcs_filepath)
  dialogue_data = load_dialogue_data(dialogues_filepath)

  if not npc_data:
    print("Could not load NPC data. Exiting.")
    return
  print(f"Successfully loaded {len(npc_data)} NPCs. First NPC: {npc_data[0].get('name', 'N/A')}")

  dialogues_to_pass = {}
  if not dialogue_data:
    print("Could not load dialogue data. Portrait generation will proceed without dialogue context.")
  else:
    print(f"Successfully loaded dialogues for {len(dialogue_data)} NPCs.")
    dialogues_to_pass = dialogue_data

  # Check for environment variable
  project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
  if not project_id:
    print("ERROR: GOOGLE_CLOUD_PROJECT environment variable not set. "
          "Portrait generation will be skipped. Exiting.")
    return

  # Generate portraits
  print("Proceeding with portrait generation...")
  updated_npcs = generate_portraits_for_npcs(npc_data, dialogues_to_pass, base_path)

  if updated_npcs: # generate_portraits_for_npcs always returns a list
    print("Finished processing NPCs for portrait generation.")
    if len(updated_npcs) > 0 and updated_npcs[0].get('portraitImage') and "placeholder" not in updated_npcs[0].get('portraitImage', ''):
        print(f"DEBUG: First NPC's updated portrait path: {updated_npcs[0].get('portraitImage')}")
    elif len(updated_npcs) > 0:
        print(f"DEBUG: First NPC processed. Portrait path: {updated_npcs[0].get('portraitImage', 'Not set')}. Check logs for success/failure.")

    if save_npc_data(npcs_file_to_save, updated_npcs):
      print(f"NPC data with updated portrait paths saved to {npcs_file_to_save}")
    else:
      print(f"Failed to save updated NPC data to {npcs_file_to_save}")
  else:
    print("Portrait generation did not return updated NPC data. Not saving.")

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

def generate_portraits_for_npcs(npcs_data_list, all_dialogues_dict, project_root_path):
  """
  Generates portraits for NPCs using the Gemini API.

  Args:
    npcs_data_list: A list of NPC data dictionaries.
    all_dialogues_dict: A dictionary of dialogue data.
    project_root_path: The absolute path to the project's root directory.
  """
  updated_npcs_data_list = []
  portraits_dir = os.path.join(project_root_path, "www", "assets", "images", "portraits")
  os.makedirs(portraits_dir, exist_ok=True)

  try:
    client = genai.Client()
    # Model name for Gemini Flash image generation, as per the example
    #model_name = "gemini-2.0-flash-preview-image-generation"
    #model_name = "gemini-2.0-flash"
    #model_name = "imagen-3.0-fast-generate-001"
    #model_name = "imagen-4.0-generate-001"
    model_name = "imagen-4.0-generate-preview-05-20"


  except ImportError:
    print("ERROR: The 'google-generativeai' library is not installed. Please install it using 'pip install google-generativeai'.")
    # Return original list if core library is missing
    return [npc.copy() for npc in npcs_data_list]
  except Exception as e:
    print(f"ERROR: Failed to initialize Gemini Client: {e}")
    print("Ensure GOOGLE_CLOUD_PROJECT is correctly set (if using ADC) and you have authenticated for Google Cloud/Gemini "
          "(e.g., 'gcloud auth application-default login' or by setting GOOGLE_API_KEY).")
    # Return original list if AI platform init fails
    return [npc.copy() for npc in npcs_data_list]

  for npc in npcs_data_list:
    npc_copy = npc.copy() # Work with a copy
    npc_id = npc_copy.get('id', 'unknown_id')
    npc_name = npc_copy.get('name', 'Unknown Name')
    npc_description = npc_copy.get('description', 'No description available.')

    image_filename = f"{npc_id}_portrait.jpg"
    prompt_filename = f"{npc_id}_prompt.txt"
    full_image_path = os.path.join(portraits_dir, image_filename)
    full_prompt_path = os.path.join(portraits_dir, prompt_filename)
    # This is the relative path that will be stored in the npcs.json file
    relative_portrait_path = f"assets/images/portraits/{image_filename}"

    if os.path.exists(full_image_path):
        print(f"INFO: Portrait for {npc_id} ({npc_name}) already exists at {full_image_path}. Skipping generation.")
        npc_copy['portraitImage'] = relative_portrait_path
        # Assuming if image exists, prompt file also exists from previous run.
    else:
        # Base prompt
        #prompt_text = f"High Quality DSLR portrait of {npc_name}: {npc_description}."
        prompt_text = f"Gritty, hyperrealistic portrait of {npc_name}, a notorious pirate: {npc_description}."

        # Add style cue
        prompt_text += "Low-key lighting, casting long shadows, highlighting rugged features and weathered attire. Volumetric fog or sea spray in the air. Close-up shot, focusing on a captivating, fierce gaze. Artstation trending, highly detailed, character design. Square, 1:1. --ar 1:1 --q 2 --no cartoon, painting, disfigured"

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

        print(f"INFO: Generating image for {npc_id} ({npc_name}) with prompt: {prompt_text}")

        try:
            response = client.models.generate_images(
                model=model_name,
                prompt=prompt_text,
                config=types.GenerateImagesConfig(
                  number_of_images=1,
                  personGeneration="allow_all",
                  include_rai_reason=True,
                  output_mime_type='image/jpeg',
              )
            )

            image_bytes_to_save = None
            if response.generated_images and response.generated_images[0].image:
                image_bytes_to_save = response.generated_images[0].image.image_bytes
            
            if image_bytes_to_save:
                try:
                    img = Image.open(BytesIO(image_bytes_to_save))
                    # Resize the image to 512x512 pixels
                    img = img.resize((512, 512))
                    img.save(full_image_path) # PIL infers format from extension, or use format='PNG'
                    
                    with open(full_prompt_path, "w") as f:
                        f.write(prompt_text)

                    print(f"SUCCESS: Generated and saved portrait and prompt for {npc_id} ({npc_name}) to {full_image_path} and {full_prompt_path}")
                    npc_copy['portraitImage'] = relative_portrait_path
                    print(f"DEBUG: NPC {npc_id} portraitImage updated to: {relative_portrait_path}")

                except ImportError: # Should be caught at top level, but as a safeguard here for PIL/BytesIO
                    print("ERROR: Pillow or io library might be missing. Please ensure 'Pillow' is installed ('pip install Pillow'). Cannot save image.")
                    # npc_copy remains without portraitImage, will be appended later
                except Exception as e:
                    print(f"ERROR: Failed to save image for {npc_id} ({npc_name}). Error: {e}")
                    # npc_copy remains without portraitImage, will be appended later
            elif response and response.candidates and not (response.candidates[0].content and response.candidates[0].content.parts):
                 print(f"ERROR: Gemini API call succeeded for {npc_id} ({npc_name}) but returned no content parts. Candidate: {response.candidates[0]}")
            else:
                print(f"ERROR: Gemini API call for {npc_id} ({npc_name}) returned no image or an unexpected response: {response}")

        except GoogleAPIError as e:
            print(f"ERROR: Failed to generate image for {npc_id} ({npc_name}) due to Google API Error. Error: {e}")
        except ImportError:
            # This specific ImportError for google-cloud-aiplatform is now less relevant.
            # ImportError for google-generativeai is handled at the function start.
            # If other ImportErrors occur here (e.g. a sub-dependency of genai not caught above),
            # it's an unexpected state.
            print(f"ERROR: An unexpected ImportError occurred: {e}") # Note: 'e' might be undefined here if this specific except block is hit due to genai not being imported.
                                                                # However, the genai import is checked at the start of the function.
        except Exception as e:
            print(f"ERROR: An unexpected error occurred while generating image for {npc_id} ({npc_name}). Error: {e}")

    updated_npcs_data_list.append(npc_copy) # Add npc_copy (modified or not)

  return updated_npcs_data_list

if __name__ == "__main__":
  main()