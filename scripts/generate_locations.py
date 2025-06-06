import json
import os
import random
import time # Added for retry backoff and rate limiting
import argparse # Added for command-line arguments
# subprocess was not used
# base64 is not needed for Gemini raw image bytes
# from google.cloud import aiplatform # Replaced with google.generativeai
from google.api_core.exceptions import GoogleAPIError

# New imports for Gemini API
import google.generativeai as genai
from google.generativeai import types
from PIL import Image
from io import BytesIO

def load_location_data(filepath):
  """
  Loads location data from a JSON file.

  Args:
    filepath: The path to the JSON file.

  Returns:
    A list of location objects if successful, None otherwise.
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
  Main function to load location data, generate images, and save updated data.
  """
  # File paths
  base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Assuming script is in 'scripts' dir
  locations_filepath = os.path.join(base_path, "www", "data", "pois.json")
  locations_file_to_save = locations_filepath # Save back to the same file

  # Load data
  location_data = load_location_data(locations_filepath)

  if not location_data:
    print("Could not load location data. Exiting.")
    return
  print(f"Successfully loaded {len(location_data)} locations. First location: {location_data[0].get('name', 'N/A')}")

  # Argument parsing for project_id and api_key
  parser = argparse.ArgumentParser(description='Generate location images.')
  parser.add_argument('--project_id', type=str, help='Google Cloud Project ID')
  parser.add_argument('--api_key', type=str, help='Google API Key')
  args = parser.parse_args()

  # Set GOOGLE_API_KEY environment variable if --api_key is provided
  cmd_line_api_key = args.api_key
  if cmd_line_api_key:
    os.environ['GOOGLE_API_KEY'] = cmd_line_api_key

  # Check for project_id from command line or environment variable
  project_id = args.project_id
  if not project_id:
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")

  if not project_id:
    print("ERROR: GOOGLE_CLOUD_PROJECT environment variable not set, and no --project_id argument provided. "
          "Location image generation will be skipped. Exiting.")
    return
  else:
    # This project_id is available for use if needed by API clients,
    # though Gemini client itself might primarily use GOOGLE_API_KEY or ADC.
    print(f"Using project ID: {project_id}")

  # Check for GOOGLE_API_KEY before proceeding
  api_key_to_use = os.getenv("GOOGLE_API_KEY")
  if not api_key_to_use:
      print("ERROR: GOOGLE_API_KEY not found as environment variable or via --api_key argument. Exiting.")
      return

  # Generate images
  print("Proceeding with image generation for locations...")
  updated_locations = generate_images_for_locations(location_data, base_path)

  if updated_locations:
    print("Finished processing locations for image generation.")
    if len(updated_locations) > 0 and updated_locations[0].get('gameViewImage') and "placeholder" not in updated_locations[0].get('gameViewImage', ''):
        print(f"DEBUG: First location's updated image path: {updated_locations[0].get('gameViewImage')}")
    elif len(updated_locations) > 0:
        print(f"DEBUG: First location processed. Image path: {updated_locations[0].get('gameViewImage', 'Not set')}. Check logs for success/failure.")

    if save_location_data(locations_file_to_save, updated_locations):
      print(f"Location data with updated image paths saved to {locations_file_to_save}")
    else:
      print(f"Failed to save updated location data to {locations_file_to_save}")
  else:
    print("Image generation did not return updated location data. Not saving.")

def save_location_data(filepath, location_data_list):
  """
  Saves the list of location data to a JSON file.

  Args:
    filepath: The path to the JSON file.
    location_data_list: The list of location objects to save.

  Returns:
    True if saving was successful, False otherwise.
  """
  try:
    with open(filepath, 'w') as f:
      json.dump(location_data_list, f, indent=2)
    print(f"Successfully saved updated location data to {filepath}")
    return True
  except IOError as e:
    print(f"ERROR: Could not write location data to {filepath}. Error: {e}")
    return False
  except Exception as e: # Catch any other potential errors during save
    print(f"ERROR: An unexpected error occurred while saving location data to {filepath}. Error: {e}")
    return False

def generate_images_for_locations(locations_data_list, project_root_path):
  """
  Generates images for locations using the Gemini API.

  Args:
    locations_data_list: A list of location data dictionaries.
    project_root_path: The absolute path to the project's root directory.
  """
  updated_locations_data_list = []
  locations_dir = os.path.join(project_root_path, "www", "assets", "images", "locations")
  os.makedirs(locations_dir, exist_ok=True)

  # --- Location Themed Prompts ---
  setting_prompts = [ # General ambiance, could be combined or used to guide
      "A mysterious and ancient {location_type} shrouded in mist.",
      "The sun-drenched shores of a forgotten {location_type}.",
      "A treacherous, storm-battered {location_type} under dark skies.",
      "A vibrant and bustling {location_type} teeming with pirate activity.",
      "An eerie and silent {location_type}, rumored to be haunted."
  ]

  subject_detail_prompts = [ # More specific, using location name and description
      "A breathtaking panoramic view of {location_name}, which is known as: \"{location_description}\".",
      "The iconic {location_name}, a place described as: \"{location_description}\". Capture its unique atmosphere.",
      "An evocative scene depicting {location_name}. The essence of this place is: \"{location_description}\".",
      "Venture into {location_name}, a location whispered about as: \"{location_description}\". Show its hidden depths.",
      "Discover the secrets of {location_name}, a place that legend says: \"{location_description}\". Highlight its most striking features."
  ]

  style_prompts = [
      "Epic fantasy art, cinematic lighting, highly detailed, reminiscent of concept art for a pirate adventure game.",
      "A photorealistic matte painting, capturing the grandeur and atmosphere of a lost world, suitable for a blockbuster film.",
      "Dark and moody oil painting style, emphasizing shadows, textures, and a sense of foreboding mystery.",
      "Vibrant and colorful digital art, capturing a lively and adventurous spirit, with crystal clear waters and lush foliage.",
      "Impressionistic concept art, focusing on the overall mood and light, with visible brushstrokes and a slightly dreamlike quality.",
      "Gritty and realistic, focusing on the harsh beauty of the pirate world, weathered textures, and dramatic skies.",
      "A beautifully detailed illustration, as if taken from the pages of an old adventurer's journal, with intricate details and annotations (though no actual text).",
      "Cinematic wide shot, focusing on the scale and scope of the landscape, with a dramatic sky and atmospheric effects like fog or god rays.",
      "Stylized realism, similar to high-end video game environments, with rich detail, dynamic lighting, and a strong sense of place.",
      "A slightly fantastical and romanticized depiction, emphasizing the allure and danger of pirate legends."
  ]
  try:
    # Configure the Gemini client using API Key
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("ERROR: GOOGLE_API_KEY environment variable not set. Image generation will be skipped.")
        return [loc.copy() for loc in locations_data_list]
    genai.configure(api_key=api_key)

    # model_name should be the specific model identifier for image generation
    # For example, 'gemini-pro-vision' can take image and text, but for pure image generation,
    # an Imagen model is typically used. The script had "imagen-4.0-generate-preview-05-20".
    # Let's assume this is a valid model for genai.GenerativeModel
    image_model_name = "imagen-4.0-generate-preview-05-20"
    # It's better to instantiate the model here if it's going to be reused.
    # However, the original script called client.models.generate_images which suggests a more direct call.
    # Given the error 'module 'google.generativeai' has no attribute 'generate_images'',
    # we need to use a GenerativeModel instance.
    try:
        model = genai.GenerativeModel(model_name=image_model_name)
    except Exception as e:
        print(f"ERROR: Failed to initialize GenerativeModel with name {image_model_name}. Error: {e}")
        return [loc.copy() for loc in locations_data_list]


  except ImportError:
    print("ERROR: The 'google-generativeai' library is not installed. Please install it using 'pip install google-generativeai'.")
    return [loc.copy() for loc in locations_data_list]
  except Exception as e: # Catching broader exceptions during configuration or API key check
    print(f"ERROR: Failed to configure Gemini or missing API Key: {e}")
    # Ensure GOOGLE_API_KEY message is part of a more general error if needed,
    # but the specific check above should handle the missing key.
    return [loc.copy() for loc in locations_data_list]

  for location in locations_data_list:
    location_copy = location.copy() # Work with a copy
    location_id = location_copy.get('id', 'unknown_location_id')
    location_name = location_copy.get('name', 'Unknown Location')
    location_description = location_copy.get('description', 'No description available.')
    game_view_image = location_copy.get('gameViewImage', '')

    # Only process if gameViewImage contains 'placeholder_poi_'
    if 'placeholder_poi_' not in game_view_image:
        print(f"INFO: Location {location_id} ({location_name}) does not use a placeholder image ('{game_view_image}'). Skipping generation.")
        updated_locations_data_list.append(location_copy)
        continue

    image_filename = f"{location_id}_generated.jpg"
    prompt_filename = f"{location_id}_prompt.txt"
    full_image_path = os.path.join(locations_dir, image_filename)
    full_prompt_path = os.path.join(locations_dir, prompt_filename)
    # Relative path for JSON, assuming 'www' is the web root.
    # The original paths in pois.json are like "../www/assets/images/locations/placeholder_poi_1.jpg"
    # So, when saving the new path, it should match this structure from the perspective of the pois.json file.
    # The script is in 'scripts/', pois.json is in 'www/data/'.
    # The images are in 'www/assets/images/locations/'.
    # So, from 'www/data/pois.json', the path to an image is '../assets/images/locations/image.jpg'
    # However, the `gameViewImage` field in `pois.json` has paths like `../www/assets/images/locations/placeholder_poi_1.jpg`
    # This implies the paths are relative to some execution context or base URL setup, not directly relative to pois.json's location.
    # Let's keep the path structure consistent with the existing entries.
    relative_image_path = f"../www/assets/images/locations/{image_filename}"


    if os.path.exists(full_image_path):
        print(f"INFO: Image for {location_id} ({location_name}) already exists at {full_image_path}. Skipping generation.")
        location_copy['gameViewImage'] = relative_image_path
    else:
        try:
            selected_subject_template = random.choice(subject_detail_prompts)
            selected_style = random.choice(style_prompts)
            # Optional: Add a setting prompt for more variety if desired
            # selected_setting = random.choice(setting_prompts).format(location_type=location_copy.get('icon', 'island')) # Use icon as a hint for type

            subject_text = selected_subject_template.format(location_name=location_name, location_description=location_description)
            # prompt_text = f"{selected_setting}. {subject_text}. {selected_style}."
            prompt_text = f"{subject_text}. {selected_style}."
            prompt_text += " No text, no words, no letters, no characters, no people, no animals, no ships, no boats unless explicitly part of the location's description. Focus on the environment and atmosphere."


            print(f"INFO: Generating image for {location_id} ({location_name}) with prompt: {prompt_text}")

            max_retries = 3
            base_delay_seconds = 5
            response = None

            for attempt in range(max_retries):
                try:
                    # Using the instantiated model to generate content (image)
                    # The prompt is passed directly.
                    # For image generation models, the response structure needs to be handled carefully.
                    # Assuming the model.generate_content(prompt) for an Imagen model returns a response
                    # where the image data can be extracted. This might need adjustment based on actual API.
                    # The previous code expected response.generated_images[0].image.image_bytes
                    # For GenerativeModel, it's usually response.parts[0].inline_data.data (for raw bytes) or similar.
                    # Or, if it's a specialized image generation function on the model, it might differ.
                    # Let's try with generate_content and then inspect the response.
                    # It's also possible that the model expects a list of Parts, not just a string prompt.
                    response = model.generate_content(prompt_text)

                    # IMPORTANT: The response structure from model.generate_content for an Imagen model
                    # might not be `response.generated_images`. It's more likely to be in `response.parts`.
                    # This part will likely need refinement after seeing the actual response or error.
                    # For now, let's assume a structure that MIGHT work or will fail informatively.
                    break
                except GoogleAPIError as e:
                    is_rate_limit_error = ("429" in str(e) and "RESOURCE_EXHAUSTED" in str(e)) or \
                                          (hasattr(e, 'code') and e.code == 429)
                    if is_rate_limit_error and attempt < max_retries - 1:
                        delay = base_delay_seconds * (2 ** attempt)
                        jitter = random.uniform(0, 0.1 * delay)
                        actual_delay = delay + jitter
                        print(f"WARNING: Rate limit hit for {location_id} ({location_name}). Retrying in {actual_delay:.2f} seconds (attempt {attempt + 1}/{max_retries}). Error: {e}")
                        time.sleep(actual_delay)
                    else:
                        print(f"ERROR: Failed to generate image for {location_id} ({location_name}) due to Google API Error (attempt {attempt + 1}/{max_retries}). Error: {e}")
                        response = None
                        break
                except Exception as e:
                    print(f"ERROR: An unexpected error occurred during API call for {location_id} ({location_name}) (attempt {attempt + 1}/{max_retries}). Error: {e}")
                    response = None
                    break

            if response:
                image_bytes_to_save = None
                # Adapting to typical genai.GenerativeModel response for images (often in parts)
                # This is speculative and needs to be confirmed with actual API response structure for Imagen models via GenerativeModel
                try:
                    if response.parts:
                        # Assuming the first part contains the image data if it's an image model
                        # The mime_type of the part should be checked.
                        # For raw image bytes, it's often response.parts[0].inline_data.data
                        # This is a common pattern for Gemini models returning images.
                        if response.parts[0].inline_data and response.parts[0].inline_data.data:
                             image_bytes_to_save = response.parts[0].inline_data.data
                        else:
                            # Fallback or alternative check if the structure is different
                            # This could be where the old `generated_images` structure was relevant if using a different client/method
                            # For now, this is a placeholder for other possible structures.
                            # If `response.generated_images` was from a different client method, this won't work here.
                            # We are now using `genai.GenerativeModel`.
                            pass # Add other extraction logic if needed

                    if not image_bytes_to_save and hasattr(response, '_raw_response') and \
                       response._raw_response.candidates and response._raw_response.candidates[0].content.parts[0].inline_data:
                         # This is trying to dig into a more raw response structure, might be needed if the direct .parts access isn't right
                         image_bytes_to_save = response._raw_response.candidates[0].content.parts[0].inline_data.data


                except AttributeError:
                    print(f"ERROR: Response object for {location_id} ({location_name}) does not have expected image data structure (e.g., .parts or _raw_response.candidates). Response: {response}")
                    image_bytes_to_save = None # Ensure it's None
                except Exception as e:
                    print(f"ERROR: Error accessing image data from response for {location_id} ({location_name}). Error: {e}. Response: {response}")
                    image_bytes_to_save = None


                if image_bytes_to_save:
                    try:
                        img = Image.open(BytesIO(image_bytes_to_save))
                        img = img.resize((512, 512)) # Resize to 512x512
                        img.save(full_image_path, "JPEG") # Save as JPEG

                        with open(full_prompt_path, "w") as f:
                            f.write(prompt_text)

                        print(f"SUCCESS: Generated and saved image and prompt for {location_id} ({location_name}) to {full_image_path} and {full_prompt_path}")
                        location_copy['gameViewImage'] = relative_image_path
                        print(f"DEBUG: Location {location_id} gameViewImage updated to: {relative_image_path}")

                        # Crucial: Wait for 10 seconds after each successful generation
                        print(f"INFO: Waiting for 10 seconds before processing next location to respect API rate limits...")
                        time.sleep(10)

                    except ImportError:
                        print("ERROR: Pillow or io library might be missing. Please ensure 'Pillow' is installed ('pip install Pillow'). Cannot save image.")
                    except Exception as e:
                        print(f"ERROR: Failed to save image for {location_id} ({location_name}). Error: {e}")
                # elif response.candidates and not (response.candidates[0].content and response.candidates[0].content.parts):
                # This check might be redundant if using model.generate_content and its response structure
                # else:
                #    print(f"ERROR: Gemini API call for {location_id} ({location_name}) returned no image or an unexpected response after retries: {response}")
                # Simplified error logging if no bytes found:
                elif not image_bytes_to_save:
                     print(f"ERROR: Gemini API call for {location_id} ({location_name}) succeeded but no image data found in the response. Response: {response}")


        except Exception as e:
            print(f"ERROR: An unexpected error occurred while generating image for {location_id} ({location_name}). Error: {e}")

    updated_locations_data_list.append(location_copy)

  return updated_locations_data_list

if __name__ == "__main__":
  main()