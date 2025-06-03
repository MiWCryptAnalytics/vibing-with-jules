# vibing-with-jules
AI Experiments

## NPC Portrait Generation

**Purpose**: This script utilizes Google Cloud Vertex AI Imagen to automatically generate portraits for Non-Player Characters (NPCs). The generation is based on their in-game descriptions and a snippet of their dialogue. Generated images are stored locally, and the `npcs.json` file is updated to include paths to these new portraits.

**Prerequisites**:

*   **Python 3**: Ensure Python 3 is installed on your system.
*   **Google Cloud AI Platform Library**: Install the necessary Python library:
    ```bash
    pip install google-cloud-aiplatform
    ```
*   **Google Cloud Authentication**: You need to be authenticated with Google Cloud. The common way to do this for local development is:
    ```bash
    gcloud auth application-default login
    ```
    Alternatively, ensure your environment is configured with appropriate credentials if running in a different context (e.g., a service account on a CI/CD server).
*   **Environment Variables**: The script requires the following environment variables to be set:
    *   `GOOGLE_CLOUD_PROJECT`: Your Google Cloud Project ID.
    *   `VERTEX_AI_REGION`: The Google Cloud region where Vertex AI services will be used (e.g., `us-central1`).

**How to Run**:

Once the prerequisites are met, you can run the script using npm (or yarn, if that is your project's standard):

```bash
npm run generate-portraits
```

**Output**:

*   **Images**: Generated portrait images will be saved in the `www/assets/images/portraits/` directory. Each image will be named according to the NPC's ID (e.g., `npcId_portrait.png`).
*   **NPC Data**: The `www/data/npcs.json` file will be automatically updated. The `portraitImage` field for each processed NPC will be set to the relative path of their newly generated portrait.

**Note on Costs**:

Please be aware that using the Google Cloud Vertex AI Imagen API will incur costs on your Google Cloud Platform account. Monitor your usage and billing accordingly.
