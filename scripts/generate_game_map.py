import json
import os
import random
import time
import argparse
from io import BytesIO

from PIL import Image
from google.api_core.exceptions import GoogleAPIError
from google import genai
from google.genai import types

# --- Configuration ---

# List of all Points of Interest to include in the map
# (As determined from previous interactions based on pois.json)
ALL_POIS = [
    "Mystic Forest Entrance", "Abandoned Mine Shaft", "Smuggler's Cove", "Sunken Shipwreck",
    "Pirate Outpost", "Port Royal Market", "Volcano Island", "Hidden Lagoon", "Tortuga Town",
    "Kraken's Abyss", "Cursed Galleon Graveyard", "Mermaid's Rock", "Blackbeard's Hidden Cache",
    "Stormy Cape of No Return", "Davy Jones' Locker Entrance", "Cannibal Island",
    "Smuggler's Secret Strait", "Treasure Fleet Wreckage Site", "Fort Caroline Ruins",
    "Ship-Trap Island", "Marooner's Rock", "The Leviathan's Ribcage", "Coral Reef Labyrinth",
    "Skeleton Key Islet", "The Barnacle Bank", "Ghost Ship Anchorage", "Sea Serpent's Pass",
    "Dead Man's Chest Island", "Rum Runner's Rendezvous", "Spyglass Hill", "Mutineer's Gallows",
    "Buried Doubloon Beach", "Captain's Quarrel Cove", "Lagoon Trader's Rest",
    "Serpent's Spine Pass", "Hidden Falls Cache", "Port Aurora"
]

TARGET_WIDTH = 1280
TARGET_HEIGHT = 900
#API_ASPECT_RATIO = "4:3" # Standard aspect ratio to request from API

# Models to try for generation
# You can add more Imagen model IDs here
MODEL_IDS_TO_TRY = [
    "imagen-3.0-fast-generate-001",
    "imagen-3.0-generate-001",
    "imagen-3.0-generate-002",
    "imagen-4.0-generate-preview-05-20",
    "imagen-4.0-generate-002",
    "imagegeneration@006", 
    #"imagegeneration@005",
    #"imagegeneration@002"
    ]

def generate_map_prompt_text(poi_list):
    """
    Generates the detailed prompt for the game map.
    """
    poi_string = ", ".join(poi_list)
    prompt = (
        f"Create a highly detailed, top-down fantasy pirate archipelago game map. "
        f"This map is for a grand seafaring adventure and must visually incorporate and clearly distinguish all of the following {len(poi_list)} locations: "
        f"{poi_string}. "
        f"The overall map should depict a cohesive world of diverse islands, treacherous waters, and varied biomes like dense jungles, "
        f"volcanic islands, sandy beaches, coral reefs, hidden coves, mountain ranges, and at least one bustling pirate port. "
        f"Showcase natural connections or perilous passages between areas, such as sea routes, narrow straits, or dangerous currents. "
        f"The art style should be rich, painterly, and evocative, reminiscent of classic RPG world maps or detailed pirate treasure maps. "
        f"Use clear visual iconography or distinct environmental features for each named location to make them identifiable without text labels. "
        #"The map should be generated with a {API_ASPECT_RATIO} aspect ratio. "
        f"Emphasize a strong sense of adventure, discovery, hidden dangers, and untold riches. "
        f"Negative prompts: no text, no words, no letters, no character figures, no people, no animals, "
        f"no ships unless they are static landmarks (e.g., shipwrecks as part of a 'Cursed Galleon Graveyard' or 'Sunken Shipwreck' location)."
    )
    return prompt

def generate_and_save_map(client, model_name, prompt_text, maps_output_dir, base_filename, version_suffix=""):
    """
    Generates a map using the specified model and saves it.
    Adds a version_suffix to the filename if provided.
    """
    print(f"\n--- Attempting generation with model: {model_name} (Version: {version_suffix or 'default'}) ---")
    
    # Sanitize model_name for use in filename
    safe_model_name = model_name.replace("/", "_").replace(":", "_")
    output_image_filename = f"{base_filename}_{safe_model_name}{version_suffix}.jpg"
    output_prompt_filename = f"{base_filename}_{safe_model_name}{version_suffix}_prompt.txt"
    
    full_image_path = os.path.join(maps_output_dir, output_image_filename)
    full_prompt_path = os.path.join(maps_output_dir, output_prompt_filename)

    if os.path.exists(full_image_path):
        print(f"INFO: Map for model {model_name} already exists at {full_image_path}. Skipping.")
        return
    
    print(f"INFO: Generating map with prompt: {prompt_text[:200]}... (full prompt in {output_prompt_filename})")

    max_retries = 3
    base_delay_seconds = 10 # Increased base delay for potentially larger image generation
    response = None

    for attempt in range(max_retries):
        try:
            response = client.models.generate_images(
                model=model_name,
                prompt=prompt_text,
                #aspect_ratio=API_ASPECT_RATIO,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    include_rai_reason=True,
                    output_mime_type='image/jpeg', # Using JPEG
                )
            )
            break # Success
        except GoogleAPIError as e:
            is_rate_limit_error = ("429" in str(e) and "RESOURCE_EXHAUSTED" in str(e)) or \
                                  (hasattr(e, 'code') and e.code == 429)
            if is_rate_limit_error and attempt < max_retries - 1:
                delay = base_delay_seconds * (2 ** attempt)
                jitter = random.uniform(0, 0.1 * delay)
                actual_delay = delay + jitter
                print(f"WARNING: Rate limit hit for model {model_name}. Retrying in {actual_delay:.2f} seconds (attempt {attempt + 1}/{max_retries}). Error: {e}")
                time.sleep(actual_delay)
            else:
                print(f"ERROR: Failed to generate map with {model_name} due to Google API Error (attempt {attempt + 1}/{max_retries}). Error: {e}")
                response = None
                break
        except Exception as e:
            print(f"ERROR: An unexpected error occurred during API call for {model_name} (attempt {attempt + 1}/{max_retries}). Error: {e}")
            response = None
            break

    if response:
        image_bytes_to_save = None
        if response.generated_images and response.generated_images[0].image:
            image_bytes_to_save = response.generated_images[0].image.image_bytes
        
        if image_bytes_to_save:
            try:
                img = Image.open(BytesIO(image_bytes_to_save))
                print(f"INFO: Original image size from {model_name}: {img.size}")
                
                # Resize to target dimensions
                img_resized = img.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.Resampling.LANCZOS)
                img_resized.save(full_image_path, "JPEG", quality=90)
                
                with open(full_prompt_path, "w", encoding="utf-8") as f:
                    f.write(prompt_text)

                print(f"SUCCESS: Generated and saved map for {model_name} (Version: {version_suffix or 'default'}) to {full_image_path} (resized to {TARGET_WIDTH}x{TARGET_HEIGHT})")
                print(f"SUCCESS: Saved prompt to {full_prompt_path}")

                # Wait a bit before the next model or if in a loop for multiple maps
                # This is a general courtesy for APIs.
                print("INFO: Waiting for 5 seconds before next operation...")
                time.sleep(5)

            except ImportError: 
                print("ERROR: Pillow (PIL) or io library might be missing. Please ensure 'Pillow' is installed. Cannot save image.")
            except Exception as e:
                print(f"ERROR: Failed to save image from {model_name}. Error: {e}")
        elif hasattr(response, 'candidates') and response.candidates and \
             not (response.candidates[0].content and response.candidates[0].content.parts): # Check for empty candidates
             print(f"ERROR: Gemini API call for {model_name} (Version: {version_suffix or 'default'}) succeeded but returned no content parts. Candidate: {response.candidates[0]}")
        else:
            rai_reason = ""
            if response.generated_images and response.generated_images[0].rai_reason:
                rai_reason = f" RAI Reason: {response.generated_images[0].rai_reason.name}"
            print(f"ERROR: Gemini API call for {model_name} (Version: {version_suffix or 'default'}) returned no image or an unexpected response after retries.{rai_reason} Response: {str(response)[:500]}")
    else:
        print(f"INFO: No response received from API for model {model_name} (Version: {version_suffix or 'default'}) after retries.")


def main():
    """
    Main function to generate the game map using different models.
    """
    # --- Path Setup ---
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root_path = os.path.dirname(script_dir) # Assuming script is in 'scripts' dir
    maps_output_dir = os.path.join(project_root_path, "www", "assets", "images", "game_maps")
    os.makedirs(maps_output_dir, exist_ok=True)
    print(f"INFO: Maps will be saved to: {maps_output_dir}")

    # --- Argument Parsing for API Credentials ---
    parser = argparse.ArgumentParser(description='Generate a game map using Gemini/Imagen models.')
    parser.add_argument('--project_id', type=str, help='Google Cloud Project ID. Can also be set via GOOGLE_CLOUD_PROJECT env var.')
    parser.add_argument('--api_key', type=str, help='Google API Key. Can also be set via GOOGLE_API_KEY env var.')
    args = parser.parse_args()

    if args.api_key:
        os.environ['GOOGLE_API_KEY'] = args.api_key
    
    # Project ID is not directly used by genai.Client() if API key is set,
    # but good practice to have it if other Google services were used.
    project_id = args.project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
    if project_id:
        print(f"INFO: Using Google Cloud Project ID: {project_id}")
    else:
        print("WARNING: GOOGLE_CLOUD_PROJECT ID not set. Not critical if GOOGLE_API_KEY is used for Gemini.")

    # --- Initialize Gemini Client ---
    try:
        # GOOGLE_API_KEY should be set in environment or via --api_key
        if not os.getenv("GOOGLE_API_KEY") and not os.getenv("GOOGLE_GENAI_USE_VERTEXAI"):
             print("ERROR: GOOGLE_API_KEY not found as environment variable or via --api_key argument, "
                   "and GOOGLE_GENAI_USE_VERTEXAI is not set. Exiting.")
             return
        
        client = genai.Client()
        print("INFO: Gemini client initialized successfully.")
    except ImportError:
        print("ERROR: The 'google-generativeai' library is not installed. "
              "Please install it using 'pip install google-generativeai'. Exiting.")
        return
    except Exception as e:
        print(f"ERROR: Failed to initialize Gemini Client: {e}. "
              "Ensure GOOGLE_API_KEY is set or Application Default Credentials are configured. Exiting.")
        return

    # --- Generate Prompt ---
    map_prompt = generate_map_prompt_text(ALL_POIS)

    # --- Generate Map with Different Models ---
    base_map_filename = "game_archipelago_map"

    if not MODEL_IDS_TO_TRY:
        print("INFO: No models specified in MODEL_IDS_TO_TRY. Nothing to generate.")
        return

    for model_id in MODEL_IDS_TO_TRY:
        print(f"\n===== Processing Model: {model_id} =====")
        for i in range(1, 5): # Generate 4 versions (v1, v2, v3, v4)
            version_suffix = f"_v{i}"
            generate_and_save_map(
                client=client,
                model_name=model_id,
                prompt_text=map_prompt,
                maps_output_dir=maps_output_dir,
                base_filename=base_map_filename,
                version_suffix=version_suffix
            )
            # The 5-second delay inside generate_and_save_map will apply between versions.

        # Delay between different models
        current_model_index = MODEL_IDS_TO_TRY.index(model_id)
        if current_model_index < len(MODEL_IDS_TO_TRY) - 1:
            next_model_id = MODEL_IDS_TO_TRY[current_model_index + 1]
            print(f"INFO: Finished all versions for {model_id}. Waiting 10 seconds before trying the next model ({next_model_id})...")
            time.sleep(10)
        print(f"===== Finished Model: {model_id} =====")

    print("\n--- Map generation process finished. ---")

if __name__ == "__main__":
    main()