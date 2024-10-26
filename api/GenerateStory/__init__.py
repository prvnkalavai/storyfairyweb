import logging
import os
import json
from datetime import datetime, timedelta
import asyncio
import uuid
import azure.functions as func
from azure.storage.blob import BlobServiceClient, ContentSettings, generate_blob_sas, BlobSasPermissions, __version__
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import openai
import aiohttp
import replicate
from dotenv import load_dotenv
import pytz
import google.generativeai as genai
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

STORY_CONTAINER_NAME = "storyfairy-stories" 
IMAGE_CONTAINER_NAME = "storyfairy-images" 

async def generate_story_openai(topic, api_key, story_length):
    try:
        client = openai.OpenAI(api_key=api_key)
        prompt = create_story_prompt(topic, story_length)
        response = client.chat.completions.create(
            model="gpt-4o-mini",  
            messages=[
                {"role": "system", "content": "You are a creative storyteller for children."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=350
        )
        logging.info(f"Raw response from OpenAI: {response.choices[0].message.content}")
        story, sentences = parse_story_json(response.choices[0].message.content.strip())
        logging.info(f"Parsed JSON story: {story}")
        return story, sentences
    except Exception as e:
        logging.error(f"OpenAI error: {e}")
        return None, None
    
async def generate_story_gemini(topic, api_key, story_length):
    try:
        genai.configure(api_key=api_key)
        prompt = create_story_prompt(topic, story_length)
        model = genai.GenerativeModel('gemini-1.5-flash') 
        response = model.generate_content(prompt)
        logging.info(f"Raw response from Gemini: {response.text}")
        story, sentences = parse_story_json(response.text.strip())
        logging.info(f"Parsed JSON story: {story}")
        return story, sentences
    except Exception as e:
        logging.error(f"Gemini error: {e}")
        return None, None
 
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
        story_json = json.loads(story_response)  
        raw_sentences = story_json['sentences']
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

async def generate_image_stable_diffusion(prompt,reference_image_url=None):
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
        output = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: replicate.run(
                "stability-ai/stable-diffusion-3",
                input=input_params
            )
        )
        image_url = output[0] 
        logging.info(f"Generated image (Stable Diffusion): {image_url}")  
        return image_url, prompt  
    except Exception as e:
        logging.error(f"Stable Diffusion error: {e}")
        return None, prompt 

async def generate_image_flux_schnell(prompt):
    try:
        output = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: replicate.run(
                "black-forest-labs/flux-schnell",
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
        )
        image_url = output[0]
        logging.info(f"Generated image (Flux Schnell): {image_url}")  
        return image_url, prompt  
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
    account_name = None

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
            account_name = client.get_secret("account-name").value
           
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
            account_name = account_name or os.environ.get("ACCOUNT_NAME")


        if not all([openai_key, gemini_key, replicate_token, storage_conn, account_key]):
            raise ValueError("Required secrets not found in environment variables or Key Vault")

        return openai_key, gemini_key, replicate_token, storage_conn, account_key, account_name

    except Exception as e:
        logging.exception(f"Error getting secrets: {e}") # Log the exception
        raise

async def generate_images_parallel(sentences, story_title, image_style, connection_string, account_key, account_name):
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i, sentence in enumerate(sentences):
            task = asyncio.create_task(process_single_image(
                session, sentence, i, story_title, image_style, 
                connection_string, account_key, account_name
            ))
            tasks.append(task)
        
        return await asyncio.gather(*tasks)

async def process_single_image(session, sentence, index, story_title, image_style, connection_string, account_key, account_name):
    detailed_prompt, _ = construct_detailed_prompt(sentence, image_style)
    
    # Try Flux Schnell first (faster)
    image_url, prompt = await generate_image_flux_schnell(detailed_prompt)
    if not image_url:
        # Fallback to Stable Diffusion
        image_url, prompt = await generate_image_stable_diffusion(detailed_prompt)
        if not image_url:
            return None
    
    try:
        async with session.get(image_url) as response:
            image_data = await response.read()
            image_filename = f"{story_title}-image{index+1}.png"
            
            # Use ThreadPoolExecutor for blob storage operations
            with ThreadPoolExecutor() as executor:
                saved_image_url = await asyncio.get_event_loop().run_in_executor(
                    executor,
                    save_to_blob_storage,
                    image_data, "image/jpeg", IMAGE_CONTAINER_NAME, 
                    image_filename, connection_string
                )
                
                if saved_image_url:
                    sas_token = await asyncio.get_event_loop().run_in_executor(
                        executor,
                        generate_sas_token,
                        account_name, account_key, IMAGE_CONTAINER_NAME,
                        image_filename, "2022-11-02"
                    )
                    
                    sas_url = f"{saved_image_url}?{sas_token}"
                    return {"imageUrl": sas_url, "prompt": prompt}
                    
    except Exception as e:
        logging.error(f"Error processing image {index+1}: {e}")
        return None

async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        # Get secrets (existing code)
        openai_api_key, GEMINI_API_KEY, REPLICATE_API_TOKEN, STORAGE_CONNECTION_STRING, ACCOUNT_KEY, ACCOUNT_NAME = get_secrets()
        openai.api_key = openai_api_key
        os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN
        
        # Get topic from either query params or request body
        topic = req.params.get('topic') 
        # If not in params, check request body
        if topic is None:  # Explicitly check for None to allow empty string
            try:
                req_body = req.get_json()
                topic = req_body.get('topic')
            except ValueError:
                return func.HttpResponse(
                    json.dumps({"error": "No topic provided. Request must include a 'topic' parameter or field (can be empty string for random story)"}),
                    mimetype="application/json",
                    status_code=400
                )
        
        # If still None after checking both places, return error
        if topic is None:
            return func.HttpResponse(
                json.dumps({"error": "No topic provided. Request must include a 'topic' parameter or field (can be empty string for random story)"}),
                mimetype="application/json",
                status_code=400
            )

        # Get other parameters with defaults
        story_length = req.params.get('storyLength', 'short')
        if not story_length:
            try:
                req_body = req.get_json()
                story_length = req_body.get('storyLength', 'short')
            except ValueError:
                story_length = 'short'

        image_style = req.params.get('imageStyle', 'whimsical')
        if not image_style:
            try:
                req_body = req.get_json()
                image_style = req_body.get('imageStyle', 'whimsical')
            except ValueError:
                image_style = 'whimsical'

        # Generate story using Gemini (faster) with fallback to OpenAI
        story, sentences = await generate_story_gemini(topic, GEMINI_API_KEY, story_length)
        if not story:
            story, sentences = await generate_story_openai(topic, openai_api_key, story_length)
            if not story:
                return func.HttpResponse("Failed to generate story", status_code=500)

        # Generate story title and filenames
        story_title = topic.replace(' ', '_') if topic and topic != '""' else str(uuid.uuid4())
        simplified_story_filename = f"{story_title}.txt"
        detailed_story_filename = f"{story_title}_detailed.txt"

        # Simplify story
        simplified_story = simplify_story(story, openai_api_key)

        # Save stories to blob storage in parallel
        with ThreadPoolExecutor() as executor:
            simplified_future = executor.submit(
                save_to_blob_storage, 
                simplified_story, "text/plain", 
                STORY_CONTAINER_NAME, 
                simplified_story_filename, 
                STORAGE_CONNECTION_STRING
            )
            detailed_future = executor.submit(
                save_to_blob_storage,
                story, "text/plain",
                STORY_CONTAINER_NAME,
                detailed_story_filename,
                STORAGE_CONNECTION_STRING
            )
            
            simplified_story_url = simplified_future.result()
            detailed_story_url = detailed_future.result()

        if not all([simplified_story_url, detailed_story_url]):
            return func.HttpResponse("Failed to upload stories to blob storage", status_code=500)

        # Generate images in parallel
        image_results = await generate_images_parallel(
            sentences, story_title, image_style,
            STORAGE_CONNECTION_STRING, ACCOUNT_KEY, ACCOUNT_NAME
        )

        # Prepare response
        response_data = {
            "StoryText": simplified_story,
            "storyUrl": simplified_story_url,
            "detailedStoryUrl": detailed_story_url,
            "images": [result for result in image_results if result],
            "imageContainerName": IMAGE_CONTAINER_NAME,
            "blobStorageConnectionString": STORAGE_CONNECTION_STRING
        }

        return func.HttpResponse(
            json.dumps(response_data, default=str),
            mimetype="application/json",
            status_code=200
        )

    except Exception as e:
        logging.exception(f"Error: {e}")
        return func.HttpResponse(f"Error during execution: {str(e)}", status_code=500)