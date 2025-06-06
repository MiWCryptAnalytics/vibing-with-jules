import json
import os
import random
import time # Added for retry backoff
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

  # --- Pirates of the Caribbean Themed Prompts ---
  setting_prompts = [
      "On the weathered deck of a haunted pirate ship, The Flying Dutchman, amidst a raging tropical storm with colossal waves crashing.",
      "Inside a dimly lit, treasure-laden pirate cove on Tortuga, with flickering torchlight and piles of gold doubloons.",
      "A foggy, moonlit Caribbean beach with a ghostly shipwreck half-submerged in the shallows, eerie bioluminescent algae glowing.",
      "The opulent, candle-lit captain's quarters of the Black Pearl, maps, astrolabes, and ancient artifacts strewn across a grand table.",
      "A bustling, rowdy pirate port town like Port Royal or Nassau, during a chaotic pirate festival with cannons firing in celebration.",
      "Deep within a cursed Aztec temple hidden in a dense jungle, booby traps and ancient glyphs visible.",
      "At the helm of a majestic galleon sailing through a mystical maelstrom towards Isla de Muerta.",
      "A tense standoff on a narrow cliffside path overlooking a churning, shark-infested sea, with crumbling ruins nearby.",
      "Inside the eerie, barnacle-encrusted brig of Davy Jones' ship, with spectral, mutated crew members and the distant sound of an organ playing.",
      "A secret meeting in a smoky, crowded tavern in a notorious pirate haven like Shipwreck Cove, hushed whispers, shifty eyes, and wanted posters on the wall.",
      "Atop the crow's nest of a pirate ship, scanning the horizon for treasure islands or enemy vessels, under a starry Caribbean night.",
      "Navigating a treacherous mangrove swamp by longboat, with hidden dangers lurking beneath the murky waters and in the dense foliage.",
      "A grand, decaying colonial governor's mansion, recently plundered by pirates, with broken furniture and scattered finery.",
      "In the heart of a voodoo ritual on a remote island, with tribal masks, bonfires, and mysterious chanting.",
      "Aboard a sinking ship during a fierce naval battle, cannons roaring, splinters flying, and the smell of gunpowder in the air.",
      "Exploring a forgotten sea cave filled with smugglers' loot and ancient, cryptic carvings, lit by a single lantern."
      
  ]

  subject_detail_prompts = [ # These will frame the NPC's name and description
      "A striking portrait of {npc_name} the {npc_description}, captured in a moment of intense decision.",
      "An evocative character concept of {npc_name} the {npc_description}, revealing their cunning nature.",
      "A detailed depiction of {npc_name} the {npc_description}, as they survey their domain with a steely gaze.",
      "{npc_name} the {npc_description}, brandishing their signature weapon (e.g., a flintlock, a cutlass, a mystical compass) with a defiant smirk.",
      "The legendary {npc_name} the {npc_description}, caught in a candid moment of reflection amidst chaos, perhaps looking at a locket or a piece of eight.",
      "A close-up of {npc_name} the {npc_description}, their eyes telling a story of countless voyages, betrayals, and battles, a scar prominently featured.",
      "{npc_name} the {npc_description}, issuing a bold command to their loyal (or mutinous) crew, pointing towards an unseen objective.",
      "The enigmatic {npc_name} the {npc_description}, examining a mysterious cursed artifact, its faint glow illuminating their face.",
      "A dynamic portrayal of {npc_name} the {npc_description}, mid-action during a daring escape, perhaps swinging on a rope or leaping across rooftops.",
      "{npc_name} the {npc_description}, with a knowing look and a raised eyebrow, as if privy to a dangerous secret or a hidden treasure map.",
      "A regal yet weathered {npc_name} the {npc_description}, adorned with pilfered finery and pirate trinkets, exuding an air of authority.",
      "{npc_name} the {npc_description}, sharing a conspiratorial whisper with an unseen accomplice, their face partially in shadow.",
      "The battle-hardened {npc_name} the {npc_description}, showing signs of a recent skirmish, with torn clothes and a determined expression.",
      "{npc_name} the {npc_description}, raising a tankard of grog in a hearty toast, a mischievous glint in their eye.",
      "A haunted depiction of {npc_name} the {npc_description}, perhaps touched by a curse or a ghostly encounter, with an ethereal quality."
      
  ]

  style_prompts = [
      "in the dramatic, gritty, and slightly fantastical art style of Pirates of the Caribbean concept art, with rich textures and cinematic lighting.",
      "rendered with hyperrealistic detail, focusing on weathered materials, sea-spray, and the glint of gold, reminiscent of a high-budget film still.",
      "as an epic, dark fantasy oil painting, capturing the golden age of piracy with a touch of the supernatural, moody and atmospheric.",
       "with a cinematic, adventurous, and mysterious feel, emphasizing dynamic poses, dramatic chiaroscuro shadows, and a sense of grand scale, like a scene from a blockbuster adventure film.",
      "in a highly detailed, character-focused illustration, highlighting intricate costume details (tricorn hats, bandanas, tattered coats), expressive faces, and a tangible sense of personality, like a character sheet for a AAA game.",
      "with the look of a meticulously crafted digital painting, focusing on realism but with an adventurous, swashbuckling flair, dramatic lighting, and a slightly desaturated color palette with pops of vibrant color.",
      "inspired by classic pirate book illustrations but with a modern, realistic twist, featuring strong line work and rich, textured coloring.",
      "as a photorealistic portrait with a shallow depth of field, making the character pop, with a slightly fantastical edge to the lighting and atmosphere.",
      "in a style that blends historical accuracy with the fantastical elements of the Pirates of the Caribbean universe, focusing on authentic period clothing and weaponry alongside subtle supernatural hints.",
      "with a painterly, almost impressionistic style, focusing on capturing the mood and essence of the character and setting rather than minute details, yet still clearly identifiable as PotC-themed."
  ]
  try:
    # Configure the Gemini client (ensure GOOGLE_API_KEY is set in your environment)
    # api_key = os.getenv("GOOGLE_API_KEY")
    # if not api_key:
    #     raise ValueError("GOOGLE_API_KEY environment variable not set.")
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
    print(f"ERROR: Failed to initialize Gemini Client or missing API Key: {e}")
    print("Ensure GOOGLE_API_KEY environment variable is set. If using ADC, ensure GOOGLE_CLOUD_PROJECT is correctly set "
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
        try: # Randomly select elements for the new prompt structure
            selected_setting = random.choice(setting_prompts)
            selected_subject_template = random.choice(subject_detail_prompts)
            selected_style = random.choice(style_prompts)

            # Construct the prompt text using the new structure
            subject_text = selected_subject_template.format(npc_name=npc_name, npc_description=npc_description)
            #prompt_text = f"{selected_setting}. {subject_text}. {selected_style}."
            prompt_text = f"{subject_text}. {selected_style}."

            # Add style cue (optional, consider if it conflicts with randomized elements)
            # prompt_text += " Artstation trending, highly detailed, character design. Square, 1:1. --ar 1:1 --q 2 --no cartoon, painting, disfigured"

            # Attempt to add dialogue to prompt
            npc_dialogue_nodes = all_dialogues_dict.get(npc_id) # This gets the dict of dialogue nodes for the NPC
            if npc_dialogue_nodes and isinstance(npc_dialogue_nodes, dict):
                dialogue_lines_to_add = []
                
                # Collect all unique, non-empty npcText entries from the NPC's dialogue nodes
                all_npc_texts = []
                seen_texts = set()
                for node_data in npc_dialogue_nodes.values():
                    if 'npcText' in node_data and node_data['npcText']:
                        text = node_data['npcText']
                        if text not in seen_texts:
                            all_npc_texts.append(text)
                            seen_texts.add(text)
                
                if all_npc_texts:
                    # Add the first unique NPC text
                    dialogue_lines_to_add.append(all_npc_texts[0])
                    # Add a second unique NPC text if available
                    if len(all_npc_texts) > 1:
                        dialogue_lines_to_add.append(all_npc_texts[1])

                if len(dialogue_lines_to_add) > 0:
                    # This phrase encourages the AI to use the dialogue for thematic inspiration
                    prompt_text += f" The character's typical expressions and manner of speaking should inform their depicted personality and attitude."

            # Append comprehensive negative prompts
            prompt_text += "No text."

            print(f"INFO: Generating image for {npc_id} ({npc_name}) with prompt: {prompt_text}")

            # Retry logic for API call
            max_retries = 3
            base_delay_seconds = 5 # Initial delay for backoff
            response = None

            for attempt in range(max_retries):
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
                    # If successful, break out of the retry loop
                    break 
                except GoogleAPIError as e:
                    # Check if the error is a 429 (Resource Exhausted)
                    is_rate_limit_error = ("429" in str(e) and "RESOURCE_EXHAUSTED" in str(e)) or \
                                          (hasattr(e, 'code') and e.code == 429)

                    if is_rate_limit_error and attempt < max_retries - 1:
                        delay = base_delay_seconds * (2 ** attempt) # Exponential backoff
                        jitter = random.uniform(0, 0.1 * delay) # Add some jitter
                        actual_delay = delay + jitter
                        print(f"WARNING: Rate limit hit for {npc_id} ({npc_name}). Retrying in {actual_delay:.2f} seconds (attempt {attempt + 1}/{max_retries}). Error: {e}")
                        time.sleep(actual_delay)
                    else:
                        print(f"ERROR: Failed to generate image for {npc_id} ({npc_name}) due to Google API Error (attempt {attempt + 1}/{max_retries}). Error: {e}")
                        response = None # Ensure response is None if all retries fail or it's a non-retryable API error
                        break # Break on non-retryable API error or last attempt
                except Exception as e: # Catch other unexpected errors during the API call
                    print(f"ERROR: An unexpected error occurred during API call for {npc_id} ({npc_name}) (attempt {attempt + 1}/{max_retries}). Error: {e}")
                    response = None # Ensure response is None
                    break # Break on other unexpected errors

            # Process the response (if any) after retries
            if response:
                image_bytes_to_save = None
                if response.generated_images and response.generated_images[0].image:
                    image_bytes_to_save = response.generated_images[0].image.image_bytes
                
                if image_bytes_to_save:
                    try:
                        img = Image.open(BytesIO(image_bytes_to_save))
                        img = img.resize((512, 512))
                        img.save(full_image_path)
                        
                        with open(full_prompt_path, "w") as f:
                            f.write(prompt_text)

                        print(f"SUCCESS: Generated and saved portrait and prompt for {npc_id} ({npc_name}) to {full_image_path} and {full_prompt_path}")
                        npc_copy['portraitImage'] = relative_portrait_path
                        print(f"DEBUG: NPC {npc_id} portraitImage updated to: {relative_portrait_path}")

                    except ImportError: 
                        print("ERROR: Pillow or io library might be missing. Please ensure 'Pillow' is installed ('pip install Pillow'). Cannot save image.")
                    except Exception as e:
                        print(f"ERROR: Failed to save image for {npc_id} ({npc_name}). Error: {e}")
                elif response.candidates and not (response.candidates[0].content and response.candidates[0].content.parts):
                     print(f"ERROR: Gemini API call succeeded for {npc_id} ({npc_name}) but returned no content parts. Candidate: {response.candidates[0]}")
                else:
                    print(f"ERROR: Gemini API call for {npc_id} ({npc_name}) returned no image or an unexpected response after retries: {response}")
            # No else needed here, as errors during API call or if response is None are already logged.

        except ImportError as e:
            # This specific ImportError for google-cloud-aiplatform is now less relevant.
            # ImportError for google-generativeai is handled at the function start.
            # If other ImportErrors occur here (e.g. a sub-dependency of genai not caught above),
            # it's an unexpected state.
            print(f"ERROR: An unexpected ImportError occurred during portrait generation for {npc_id} ({npc_name}). Error: {e}")
        except Exception as e:
            print(f"ERROR: An unexpected error occurred while generating image for {npc_id} ({npc_name}). Error: {e}")

    updated_npcs_data_list.append(npc_copy) # Add npc_copy (modified or not)

  return updated_npcs_data_list

if __name__ == "__main__":
  main()