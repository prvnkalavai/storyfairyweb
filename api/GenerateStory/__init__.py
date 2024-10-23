import logging
import os
import json
from datetime import datetime, timedelta
import time
import uuid
import azure.functions as func
from azure.storage.blob import BlobServiceClient, ContentSettings, generate_blob_sas, BlobSasPermissions, __version__
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import openai
import requests
import replicate
from dotenv import load_dotenv
import pytz
import google.generativeai as genai

load_dotenv()

STORY_CONTAINER_NAME = "storyfairy-stories" # Container for Stories
IMAGE_CONTAINER_NAME = "storyfairy-images" # Container for Images

def generate_story_openai(topic, api_key, story_length):
    try:
        client = openai.OpenAI(api_key=api_key)
        prompt = create_story_prompt(topic, story_length)
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Or a suitable model
            messages=[
                {"role": "system", "content": "You are a creative storyteller for children."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=350
        )
        #story = response.choices[0].message.content
        #return story
        logging.info(f"Raw response from OpenAI: {response.choices[0].message.content}")
        story, sentences = parse_story_json(response.choices[0].message.content.strip())
        logging.info(f"Parsed JSON story: {story}")
        return story, sentences       
        
    except (openai.OpenAIError, requests.exceptions.RequestException) as e: # Catch OpenAI errors
        logging.error(f"OpenAI API error: {e}")
        return None
    
def generate_story_gemini(topic, api_key, story_length):
    try:
        Gemini_api_key = api_key
        genai.configure(api_key=Gemini_api_key)
        prompt = create_story_prompt(topic, story_length)
        model = genai.GenerativeModel('gemini-1.5-flash') # or 'gemini-pro'
        response = model.generate_content(prompt)
        logging.info(f"Raw response from Gemini: {response.text}")
        story, sentences = parse_story_json(response.text.strip())
        logging.info(f"Parsed JSON story: {story}")
        return story, sentences
    
    except Exception as e:
        logging.error(f"Gemini error: {e}")
        return None   

def create_story_prompt(topic, story_length="short"):
    """Creates the story prompt based on whether a topic is provided or not."""
    sentence_count = { "short": 5, "medium": 7, "long": 9}
    num_sentences = sentence_count.get(story_length, 5)
    if topic:
        prompt = f"""
        Write a {story_length}, imaginative and creative {num_sentences} sentence children's story about {topic}.  

            Format the story as a followind JSON object with each sentence as a separate entry in an array of sentences to ensure consistent structure:
            Avoid having any markdown components in the JSON output.
            {{
                "sentences": [
                    "Sentence 1 with full character and scene details.",
                    "Sentence 2 with full character and scene details.",
                    "Sentence 3 with full character and scene details.",
                    "Sentence 4 with full character and scene details.",
                    "Sentence 5 with full character and scene details." 
                ]
            }}
            
            Crucially, EVERY sentence must include these details:
            * **Central Character:**  Always mention the main character by name. Include a FULL description of their appearance, personality, accessories, and any unique attributes like clothing, toys, skin color, hair/fur color etc in EVERY sentence.  Be extremely repetitive with explicit details.
            * **Scene:**  Vividly describe the setting in EVERY sentence.  If the scene changes, provide the FULL new scene description in EVERY subsequent sentence.  Be extremely repetitive with explicit details.
            * **Supporting Characters:** If new characters appear, provide their FULL descriptions in EVERY sentence where they are present. Be extremely repetitive with explicit details.
            * **Objects/Items:** If any objects/tools/machinery are mentioned in the story, scene or used by any of the characters, maintain the full description of those artifacts and keep it consistent across the story/scenes. Be extremely repetitive with explicit details

            Example:
            "Leo, a brave knight with shining armor and a golden sword, stood in the dark, echoing castle, facing a fierce dragon with fiery breath."
            "Leo, a brave knight with shining armor and a golden sword, charged at the fierce dragon with fiery breath in the dark, echoing castle."
            # and so on...  Every sentence must mention ALL relevant characters and FULL scene details. Ensure no details are left out in any sentence
            """
    else:
        prompt = """
        Write a random {story_length}, imaginative and creative {num_sentences} sentence children's story.  

            Format the story as a followind JSON object with each sentence as a separate entry in an array of sentences to ensure consistent structure:
            Avoid having any markdown components in the JSON output.
            {
                "sentences": [
                    "Sentence 1 with full character and scene details.",
                    "Sentence 2 with full character and scene details.",
                    "Sentence 3 with full character and scene details.",
                    "Sentence 4 with full character and scene details.",
                    "Sentence 5 with full character and scene details." 
                ]
            }
            
            Crucially, EVERY sentence must include these details:
            * **Central Character:**  Always mention the main character by name. Include a FULL description of their appearance, personality, accessories, and any unique attributes like clothing, toys, skin color, hair/fur color,etc in EVERY sentence.  Be extremely repetitive with explicit details.
            * **Scene:**  Vividly describe the setting in EVERY sentence.  If the scene changes, provide the FULL new scene description in EVERY subsequent sentence.  Be extremely repetitive with explicit details.
            * **Supporting Characters:** If new characters appear, provide their FULL descriptions in EVERY sentence where they are present. Be extremely repetitive with explicit details.
            * **Objects/Items:** If any objects/tools/machinery/items/artifacts are mentioned in the story, scene or used by any of the characters, maintain the full description of those artifacts and keep it consistent across the story/scenes. Be extremely repetitive with explicit details

            Example:
            "Leo, a brave knight with shining armor and a golden sword, stood in the dark, echoing castle, facing a fierce dragon with fiery breath."
            "Leo, a brave knight with shining armor and a golden sword, charged at the fierce dragon with fiery breath in the dark, echoing castle."
            # and so on...  Every sentence must mention ALL relevant characters and FULL scene details. Ensure no details are left out in any sentence
            """
    return prompt

def parse_story_json(story_response):
    try:
        story_json = json.loads(story_response)  # Directly parse
        raw_sentences = story_json['sentences']

        # Validate and clean sentences (important)
        sentences = []
        for sentence in raw_sentences:
            cleaned_sentence = sentence.strip()
            if cleaned_sentence:  # Check if the sentence is not empty after cleaning
                sentences.append(cleaned_sentence)
            else:
                logging.warning(f"Skipping empty sentence from JSON: '{sentence}'")

        if not sentences: # If all sentences are empty, return None
            logging.error(f"All sentences are empty after cleaning.")
            return None, None

        story = ' '.join(sentences)  # Use space as separator for simplified story


        return story, sentences # Return both complete story and list of sentences


    except (json.JSONDecodeError, KeyError, TypeError) as e:  # Handle JSON and KeyError if sentences is not present
        logging.error(f"Invalid or empty JSON response: {story_response}")
        logging.error(f"JSON parsing error: {e}")  # Log the specific exception
        return None, None  # Return None for both to indicate failure

def simplify_story(detailed_story, api_key):
    try:
        client = openai.OpenAI(api_key=api_key) # Or use Gemini. Configure appropriately
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Suitable model for simplification
            messages=[
                {"role": "system", "content": "You are a helpful assistant that simplifies text."},
                {"role": "user", "content": f"Please simplify the following story, removing repetitive descriptions while maintaining the core narrative in the same number of sentences as the original story:\n\n{detailed_story}"}

            ],
            max_tokens=300 # Adjust if needed
        )
        simplified_story = response.choices[0].message.content
        logging.info(f"Simplified story:\n{simplified_story}")
        return simplified_story

    except Exception as e:
        logging.error(f"Error simplifying story: {e}")
        return detailed_story  # Return original story if simplification fails

def generate_reference_image(character_description):
    prompt = f"High-resolution portrait of {character_description}, full body, detailed, character concept art, trending on ArtStation" # Create prompt
    try:
        logging.info(f"Reference image prompt: {prompt}")
        output = replicate.run(
            "stability-ai/stable-diffusion-3", # Or another high-quality model
            input={
                "prompt": prompt,
                "cfg": 7,
                "steps": 28,
                "width": 1024, # Higher resolution
                "height": 1024, # Higher resolution
                "samples": 1, # Generate just one image.
                "aspect_ratio": "1:1",
                "output_quality": 90,
                "negative_prompt": "ugly, blurry, distorted, text, watermark",
                "prompt_strength": 0.85,
                "scheduler": "K_EULER_ANCESTRAL"
            }
        )

        image_url = output[0] # Get URL from replicate response
        logging.info(f"Generated reference image: {image_url}")

        return image_url  # Return URL of reference image.
    except Exception as e:
        logging.error(f"Error generating reference image: {e}")
        return None

def generate_image_stable_diffusion(prompt,reference_image_url=None):
    input_params = {
        "cfg": 7,
        "steps": 28,
        "prompt": prompt,
        "aspect_ratio": "1:1",
        "output_quality": 100,
        "negative_prompt": "ugly, blurry, distorted, text, watermark",
        "prompt_strength": 0.85,
        "scheduler": "K_EULER_ANCESTRAL",
        "width": 768, 
        "height": 768  
    }
    if reference_image_url:
        input_params["image"] = reference_image_url
    try:
        output = replicate.run(
           "stability-ai/stable-diffusion-3",  # Stable Diffusion model
            input=input_params
        )
        image_url = output[0] # Get first element of returned list which is the URL
        logging.info(f"Generated image (Stable Diffusion): {image_url}")  # Log generated URL
        return image_url, prompt  # Return URL and prompt
    except Exception as e:
        logging.error(f"Stable Diffusion error: {e}")
        return None, prompt # Return None for URL and the prompt

def generate_image_flux_schnell(prompt):
    try:
        output = replicate.run(
            "black-forest-labs/flux-schnell",  # Flux Schnell model
            input={
                "prompt": prompt,
                "aspect_ratio": "1:1",
                "go_fast": True,
                "megapixels": "1",
                "num_outputs": 1,
                "output_quality": 100,
                "num_inference_steps": 4
                }                
            )
        image_url = output[0]
        logging.info(f"Generated image (Flux Schnell): {image_url}")  # Log the generated image URL
        return image_url, prompt  # Return URL and prompt
    except Exception as e:
        logging.error(f"Flux Schnell error: {e}")
        return None, prompt

def save_to_blob_storage(data, content_type, container_name, file_name, connection_string): 
  try:
    blob_service_client = BlobServiceClient.from_connection_string(connection_string)
    container_client = blob_service_client.get_container_client(container_name)

    #if container_name == STORY_CONTAINER_NAME:
    #    file_name += ".txt"
    #else:
    #    file_name += ".png" # Check and change the image format as needed
        
    blob_client = container_client.get_blob_client(file_name)

    blob_client.upload_blob(data, blob_type="BlockBlob", content_settings=ContentSettings(content_type=content_type))
    logging.info(f"File {file_name} uploaded to blob storage in container: {container_name}")

    return blob_client.url # Return the blob URL

  except Exception as e:
    logging.error(f"Error uploading to blob storage: {e}")
    return None

def generate_sas_token(account_name, account_key, container_name, blob_name, api_version="2022-11-02"): 
    """Generates a SAS token for a blob with a specific API version."""
    logging.info(f"Azure Storage Blob SDK version: {__version__}")
    est = pytz.timezone('US/Eastern')
    now = datetime.now(est)
    expiry_time = now + timedelta(hours=1)
    
    sas_token = generate_blob_sas(
        account_name=account_name,
        container_name=container_name,
        blob_name=blob_name,
        account_key=account_key,
        permission=BlobSasPermissions(read=True),
        expiry=expiry_time.astimezone(pytz.utc), 
        version=api_version,  
    )

    return sas_token

def construct_detailed_prompt(sentence, image_style="whimsical"):
    prompt = f"{sentence}, {image_style} style, children's book illustration, vibrant colors"
    return prompt, None

def get_secrets():
    """Get secrets from either Key Vault or environment variables"""
    openai_key = None
    gemini_key = None
    replicate_token = None
    storage_conn = None
    account_key = None
    try:
        # Attempt to retrieve from Key Vault first (best practice)
        key_vault_uri = os.environ.get("KEY_VAULT_URI") # Get Key Vault URI
        if key_vault_uri:  # Only attempt Key Vault access if URI is available
            logging.info("Attempting to fetch secrets from Key Vault")

            if os.environ.get("AZURE_FUNCTIONS_ENVIRONMENT") == "Development": # For local dev, authenticate using logged in user with az login
               credential = DefaultAzureCredential()
            else:
               credential = DefaultAzureCredential() # For Azure, no credentials needed since function app will use Managed Identity

            client = SecretClient(vault_url=key_vault_uri, credential=credential)
            openai_key = client.get_secret("openai-api-key").value
            gemini_key = client.get_secret("gemini-api-key").value
            replicate_token = client.get_secret("replicate-api-token").value
            storage_conn = client.get_secret("storage-connection-string").value
            account_key = client.get_secret("account-key").value
           
            logging.info("Secrets successfully fetched from Key Vault") # Add logging for successful fetch.
        else:
            logging.warning("Key Vault URI not found. Falling back to environment variables.")

        # Fallback to environment variables ONLY if Key Vault access fails or Key Vault URI is not set
        if not all([openai_key, gemini_key, replicate_token, storage_conn, account_key]):
            logging.warning("Some secrets not found in Key Vault. Checking for environment variables")
            openai_key = openai_key or os.environ.get("OPENAI_API_KEY") # Assign from env variables
            gemini_key = gemini_key or os.environ.get("GEMINI_API_KEY")
            replicate_token = replicate_token or os.environ.get("REPLICATE_API_TOKEN")
            storage_conn = storage_conn or os.environ.get("STORAGE_CONNECTION_STRING")
            account_key = account_key or os.environ.get("ACCOUNT_KEY")


        if not all([openai_key, gemini_key, replicate_token, storage_conn, account_key]):
            raise ValueError("Required secrets not found in environment variables or Key Vault")

        return openai_key, gemini_key, replicate_token, storage_conn, account_key

    except Exception as e:
        logging.exception(f"Error getting secrets: {e}") # Log the exception
        raise

async def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('############### Python HTTP trigger function processed a request.################')

    try:
        if os.environ.get("AZURE_FUNCTIONS_ENVIRONMENT") is None: # Check if development environment
            logging.info("################# Using local authentication #################")
            
        else:  # Azure environment
            logging.info("#################Using Managed Identity authentication. #################")

        openai_api_key, GEMINI_API_KEY, REPLICATE_API_TOKEN, STORAGE_CONNECTION_STRING, ACCOUNT_KEY = get_secrets()
        openai.api_key = openai_api_key
        os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN 

        topic = req.params.get('topic')
        story_length = req.params.get('storyLength', 'short')
        image_style = req.params.get('imageStyle', 'whimsical')
        
        if not topic:  # Check if the topic is missing in query parameters
            try:
                req_body = req.get_json() # Check if topic is in request body
                if req_body: # Check if request body is empty
                    topic = req_body.get('topic')  # Try to get the topic from the request body
                    story_length= req_body.get('storyLength', 'short')
                    image_style= req_body.get('imageStyle', 'whimsical')
            except ValueError:
                pass
        if topic is None:
            # Do nothing and return to wait for topic from frontend. No need to generate random story here. 
            return func.HttpResponse("Waiting for topic input...", status_code=400) 
        topic = str(topic).strip() 
        story, sentences = generate_story_gemini(topic, GEMINI_API_KEY, story_length) 
        if story is None: # Check if gemini story generation failed
            story, sentences = generate_story_openai(topic, openai.api_key, story_length)  # Gemini fallback
            if story is None: # If openai also fails
                return func.HttpResponse("Failed to generate story using OpenAI and Gemini", status_code=500)
            
        simplified_story = simplify_story(story, openai.api_key)  # Simplify the story for presentation
        logging.info(f"Topic (before check): Value: '{topic}', Type: {type(topic)}")
        if not topic or topic == '""':
            logging.info("Topic is null. Generating a random file name")
            story_title=str(uuid.uuid4())
            simplified_story_filename =story_title + ".txt"
            detailed_story_filename = story_title + "_detailed.txt"
        else:
            logging.info(f"Using provided topic for the file name: {topic}")
            story_title=topic.replace(' ', '_')
            simplified_story_filename = f"{topic.replace(' ', '_')}.txt" # Meaningful story filename
            detailed_story_filename = f"{topic.replace(' ', '_')}_detailed.txt" # Separate file name for detailed story
        simplified_story_url = save_to_blob_storage(simplified_story, "text/plain", STORY_CONTAINER_NAME, simplified_story_filename, STORAGE_CONNECTION_STRING)
        detailed_story_url = save_to_blob_storage(story, "text/plain", STORY_CONTAINER_NAME, detailed_story_filename, STORAGE_CONNECTION_STRING)
        if simplified_story_url is None: # Handle story upload failure
            return func.HttpResponse("Failed to upload story to blob storage", status_code=500)
        if detailed_story_url is None: # Handle Detailed story upload failure
            return func.HttpResponse("Failed to upload Detailed story to blob storage", status_code=500)
            
            #story_json = json.loads(story) # Load detailed story, which is a json string into python dict
            #sentences = story_json.get("sentences", []) # Get the list of sentences from the dictionary
        response_data = {  # Initialize response data here
            "storyText": simplified_story,
            "storyUrl": simplified_story_url,
            "detailedStoryUrl": detailed_story_url,
            "images": [],
            "imageContainerName": IMAGE_CONTAINER_NAME,
            "blobStorageConnectionString": STORAGE_CONNECTION_STRING
        }
           
        image_urls = []
        image_prompts = []

        if sentences:
            for i, sentence in enumerate(sentences):  # Iterate through ALL sentences
                logging.info('################ Entering construct_detailed_prompt() Function ################')
                detailed_prompt, _ = construct_detailed_prompt(sentence, image_style) # Create detailed prompt, _ for unused reference image url
            
                logging.info('################ Entering generate_image_stable_diffusion() Function ################')
                image_url, prompt = generate_image_flux_schnell(detailed_prompt) # No reference image available
                if image_url is None:  # Stable Diffusion fallback
                    image_url, prompt = generate_image_stable_diffusion(detailed_prompt) 
                    if image_url is None: # If flux schnell also fails
                        logging.error(f"Failed to generate image for prompt: {prompt}") # Log the failing prompt
                        continue # Skip this sentence and move to next one.
                image_urls.append(image_url)
                image_prompts.append(prompt)
                time.sleep(1)

        else: # If sentences list is empty or None
            return func.HttpResponse("Error processing the story. Please try again.", status_code=500)
            
        for i, image_url in enumerate(image_urls):
            try:
                image_response = requests.get(image_url)  # Get the actual URL from the list returned by replicate
                image_response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
                image_data = image_response.content
                image_filename = f"{story_title}-image{i+1}.png" # Updated image file name
                saved_image_url = save_to_blob_storage(image_data, "image/jpeg", IMAGE_CONTAINER_NAME, image_filename, STORAGE_CONNECTION_STRING) # Pass file_name

                if saved_image_url: # Check if upload was successful
                    sas_token = generate_sas_token(
                        account_name="rgstoryfairya7d9",
                        account_key=ACCOUNT_KEY,
                        container_name=IMAGE_CONTAINER_NAME,
                        blob_name=image_filename,
                        api_version="2022-11-02"
                    )
                    sas_url = f"{saved_image_url}?{sas_token}"
                    response_data["images"].append({
                        "imageUrl": sas_url,
                        "prompt": image_prompts[i]
                    })
                    logging.info(f"Generated image {i+1} URL: {saved_image_url}")
                    logging.info(f"Prompt used for image {i+1}: {image_prompts[i]}")  # Log prompt with image URL
                    
            except requests.exceptions.RequestException as e:
                logging.error("Error downloading image: %s", e)
            except Exception as e:
                logging.error("Error saving image %s to blob storage: %s", i+1, e)

        return func.HttpResponse(
            json.dumps(response_data, default=str),  # Return grouped image URLs and prompts
            mimetype="application/json",
            status_code=200
        )
    except ValueError as ve:
        logging.exception(f"Configuration error: {ve}")
        return func.HttpResponse("Error retrieving secrets. Check Function App Logs and/or application settings",
            status_code=500
        )
    except Exception as e:
        logging.exception("An error occurred: %s", e)
        return func.HttpResponse("Error during function execution. Check Function App logs.",
            status_code=500
        )