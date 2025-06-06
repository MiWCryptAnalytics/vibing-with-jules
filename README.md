# Vibing with Jules - A Pirate's Life Adventure
## AI experiments
---
title: "Vibing with Jules"
This is a AI powered experiment using Jules and Gemini Code Assist to synthesize a modern web game.

Welcome to "Vibing with Jules," an interactive adventure set in the treacherous and exciting world of Caribbean pirates! Prepare to navigate bustling port towns, encounter mysterious characters, and perhaps even uncover cursed treasures.

## ⚓ Game Overview

"Vibing with Jules" immerses players in a narrative-driven experience inspired by tales of piracy, adventure, and the supernatural, reminiscent of the "Pirates of the Caribbean" saga. Players will interact with a diverse cast of Non-Player Characters (NPCs), each with their own stories, secrets, and dialogues that shape the unfolding adventure.

### Game Contents:

*   **Unique NPCs**: Encounter a variety of characters, from grizzled sea dogs and cunning merchants to enigmatic mystics and formidable pirate captains. Each NPC has a distinct personality, background, and role in the game world.
*   **Dynamic Dialogues**: Engage in conversations that can reveal crucial information, offer quests, or lead to unexpected consequences. The dialogue system is designed to bring the NPCs and the world to life.
*   **Themed Portraits**: Every key NPC features a unique, AI-generated portrait that captures their essence within the game's "Pirates of the Caribbean" aesthetic. These portraits are created by a specialized script to enhance immersion.
*   **Rich Setting**: Explore a world of sun-drenched islands, dangerous waters, hidden coves, and rowdy pirate havens. The atmosphere is steeped in the lore of the golden age of piracy.

## 📜 Portrait Generation Script (`scripts/generate_portraits.py`)

While the backend script handles the artistic sorcery for our characters, the interactive game itself is brought to life in the browser using modern web technologies.

### 💻 Technical Stack (Front-End)

*   **Lit (LitElement & LitHTML)**: The core of our interactive experience is built using Lit. This simple, fast, and lightweight library helps us create reactive web components.
    *   **Why Lit?**: Lit allows for efficient rendering and updating of the game's UI, managing dynamic content like NPC dialogues, player choices, and visual elements with ease. Its component-based architecture keeps the codebase organized and maintainable as the game world expands.
    *   **Key Uses**: We leverage Lit to construct the main game interface, display NPC information, render dialogue trees, and handle player interactions, ensuring a smooth and engaging experience for aspiring pirates.
*   **HTML, CSS, JavaScript**: Standard web technologies form the foundation, with Lit enhancing our ability to build complex UIs.


To bring our characters to life visually, we use a Python script that leverages the power of Google's Gemini API (specifically the Imagen model) to generate unique portraits for each NPC.

### Purpose:

The primary goal of `generate_portraits.py` is to automatically create high-quality, thematically consistent portrait images for the NPCs defined in `www/data/npcs.json`. This ensures each character has a unique visual representation that aligns with the game's "Pirates of the Caribbean" style.

### How it Works:

1.  **Data Loading**: The script begins by loading NPC data from `www/data/npcs.json` and (optionally) dialogue data from `www/data/dialogues.json`.
2.  **Prompt Construction**: For each NPC without an existing portrait, a detailed prompt is constructed. This prompt follows a "Subject, Style" structure (and previously "Setting, Subject, Style"):
    *   **Subject**: Describes the NPC (name, description) and frames them in a particular action or pose (e.g., "A striking portrait of {npc_name} the {npc_description}, captured in a moment of intense decision.").
    *   **Style**: Defines the artistic execution, drawing from a list of "Pirates of the Caribbean" inspired styles (e.g., "in the dramatic, gritty, and slightly fantastical art style of Pirates of the Caribbean concept art...").
    *   *(Dialogue Influence)*: The script can incorporate snippets of an NPC's dialogue to further inform the AI about their personality and attitude, aiming for a more nuanced depiction.
    *   *(Negative Prompts)*: A negative prompt "No text" is added to prevent the AI from generating text on the image.
3.  **API Call**: The script sends the generated prompt to the Google Gemini API (Imagen model).
    *   It includes retry logic with exponential backoff to handle potential rate limits or transient API errors.
4.  **Image Processing & Saving**:
    *   If the API call is successful, the received image data (JPEG) is processed.
    *   The image is resized to 512x512 pixels.
    *   The final portrait is saved to `www/assets/images/portraits/{npc_id}_portrait.jpg`.
    *   The prompt used to generate the image is saved to `www/assets/images/portraits/{npc_id}_prompt.txt` for reference.
5.  **Data Update**: The `npcs.json` file is updated with the relative path to the newly generated portrait for the respective NPC (e.g., `assets/images/portraits/{npc_id}_portrait.jpg`).
6.  **Skipping Existing Portraits**: If a portrait for an NPC already exists, its generation is skipped to save time and resources.

### Setup & Usage:

1.  **Environment**:
    *   Ensure you have Python installed.
    *   Install necessary libraries:
        ```bash
        pip install google-generativeai Pillow
        ```
2.  **API Key/Authentication**:
    *   The script requires authentication with Google Cloud. You can either:
        *   Set the `GOOGLE_API_KEY` environment variable with an API key that has access to the Gemini API (Imagen).
        *   Or, use Application Default Credentials (ADC) by running `gcloud auth application-default login` and ensuring the `GOOGLE_CLOUD_PROJECT` environment variable is set to your Google Cloud Project ID.
3.  **Running the Script**:
    *   Navigate to the root directory of the project.
    *   Execute the script using:
        ```bash
        python scripts/generate_portraits.py
        ```

### Customization:

The visual style and scenarios for the portraits can be easily customized by modifying the following lists within `scripts/generate_portraits.py`:
*   `setting_prompts` (if you wish to re-add the setting component to the prompt)
*   `subject_detail_prompts`
*   `style_prompts`

Feel free to add, remove, or edit these prompt components to explore different artistic directions or adapt to other themes.

## 📁 Project Structure (Key Directories)

*   `scripts/`: Contains utility scripts, including `generate_portraits.py`.
*   `www/`: Root directory for the web-based game.
    *   `data/`: Contains JSON files for game data like `npcs.json` and `dialogues.json`.
    *   `assets/`:
        *   `images/`:
            *   `portraits/`: Stores the AI-generated NPC portraits and their corresponding prompts.

## 🏴‍☠️ Future Enhancements (Ideas)

*   More complex dialogue branching and player choices.
*   Interactive map for navigation.
*   Inventory system for treasures and quest items.
*   Mini-games (e.g., dice, card games).

---

Fair winds and following seas on your development voyage!
