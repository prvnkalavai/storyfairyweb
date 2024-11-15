# StoryFairy 🧚‍💫📖

StoryFairy is an AI-powered web application that generates unique children's stories with accompanying images and narration.  It's designed to make bedtime stories more engaging and spark children's imaginations.

## Features

* **AI-Powered Story and Image Generation:** Create original stories on any topic or generate random stories.
* **Multiple Story Lengths:** Choose from short, medium, or long stories.
* **Image Style Selection:** Customize the style of the generated images (whimsical, realistic, etc.).
* **AI Model Selection**:  Choose from different AI models for story and image generation.
* **Image Carousel:** Swipe through the images as the story is narrated.
* **Text-to-Speech Narration:**  Enjoy automated narration of the generated stories.
* **Storybook PDF Download:** Download and share the story as a beautifully formatted PDF. (Coming soon)
* **User Accounts/Authentication:**  Save your favorite stories. (Coming soon)
* **Personalized Stories:** Let your child be the star of their own story! (Coming soon)



## Tech Stack

* **Frontend:** React, Material UI, TypeScript
* **Backend:** Azure Functions, Python, Azure Blob Storage, Azure Key Vault
* **AI:** OpenAI/Gemini (story generation), Stable Diffusion (image generation), Azure Cognitive Services (text-to-speech - planned)
* **Deployment:** Azure Static Web Apps, GitHub Actions


## Local Development

1. **Clone the repository:** `git clone https://github.com/your-username/storyfairyweb.git`
2. **Install frontend dependencies:** `npm install` (in the project root directory)
3. **Install backend dependencies:** `pip install -r requirements.txt` in a Python virtual environment. (inside api folder)
4. **Create `.env` file**: add your necessary API keys, URLs and secrets to the .env file for local development, which should be located in the project root directory. These should already be in your Key Vault.
5. **Start frontend:** `npm start`
6. **Start backend:** In a separate terminal, `swa start`
7. **Set Environment variables:**
    ```
    SET FUNCTIONS_WORKER_RUNTIME=python
    SET AzureWebJobsStorage=""
    ```
   Get any other required application settings such as `KEY_VAULT_URI` from Azure and set them locally as well if needed by the function.
8. **Set CORS for local Function if needed**:  Make sure the correct CORS settings are set in local.settings.json to allow requests from localhost:3000 during local development.
9. **OR alternatively run this**:
    ```
    swa start http://localhost:7071 --run "npm start"
    ```
    Then replace the apiUrl in StoryGenerator component to use the one from the above command instead of localhost:7071 for testing locally. Use correct relative paths in apiUrl to call functions deployed to Azure as part of your static web app.

## Contributing

Contributions are welcome!  Please open an issue or submit a pull request.


## Screenshots (coming)




## Future Enhancements

* Improved image/narration synchronization.
* Enhanced PDF storybook generation with more customization options.
* User accounts and personalized stories.
* Integration with other AI models for enhanced creativity.



## Contact

Praveen Kalavai - praveenkalavai@outlook.com - https://www.linkedin.com/in/praveenkalavai