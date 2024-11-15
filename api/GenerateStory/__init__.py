import logging
import os
import json
from datetime import datetime, timedelta
import asyncio
import uuid
import azure.functions as func
from azure.functions import HttpRequest, HttpResponse
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
from dataclasses import dataclass
from typing import Any, Dict
from .auth.middleware import AuthMiddleware

# Declare the global variable at module level
auth_middleware = None

load_dotenv()

STORY_CONTAINER_NAME = "storyfairy-stories" 
IMAGE_CONTAINER_NAME = "storyfairy-images" 
#auth_middleware = None

@dataclass
class Config:
    openai_key: str
    gemini_key: str
    replicate_token: str
    storage_conn: str
    account_key: str
    account_name: str
    grok_key: str
    b2c_client_id: str
    b2c_tenant: str
    b2c_user_flow: str



async def initialize_auth(config):
    """Initialize the auth middleware with configuration"""
    global auth_middleware
    try:
        # Get B2C configuration from environment variables
        #tenant = os.getenv('B2C_TENANT')
        #client_id = os.getenv('B2C_CLIENT_ID')
        #user_flow = os.getenv('B2C_USER_FLOW')
        
        tenant = config.b2c_tenant
        client_id = config.b2c_client_id
        user_flow = config.b2c_user_flow
        

        if not all([tenant, client_id, user_flow]):
            logging.error("Missing required B2C configuration")
            raise ValueError("Missing required B2C configuration")
            
        auth_middleware = AuthMiddleware(
            tenant=tenant,
            client_id=client_id,
            user_flow=user_flow
        )
        logging.info("Auth middleware initialized successfully")
        return auth_middleware
    except Exception as e:
        logging.error(f"Failed to initialize auth middleware: {str(e)}")
        raise

async def generate_story_openai(topic, api_key, story_length, story_style):
    try:
        client = openai.OpenAI(api_key=api_key)
        prompt = create_story_prompt(topic, story_length, story_style)
        response = client.chat.completions.create(
            model="gpt-4o-mini",  
            messages=[
                {"role": "system", "content": "You are a creative storyteller for children."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500
        )
        #logging.info(f"Raw response from OpenAI: {response.choices[0].message.content}")
        title, story, sentences = parse_story_json(response.choices[0].message.content.strip())
        #logging.info(f"Parsed JSON story: {story}")
        return title, story, sentences
    except Exception as e:
        logging.error(f"OpenAI error: {e}")
        return None, None, None

async def generate_story_grok(topic, api_key, story_length, story_style):
    try:
        client = openai.OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
        prompt = create_story_prompt(topic, story_length, story_style)
        response = client.chat.completions.create(
            model="grok-beta",  
            messages=[
                {"role": "system", "content": "You are Grok, a creative storyteller for children."},
                {"role": "user", "content": prompt}
            ],
        )
        #logging.info(f"Raw response from Grok: {response.choices[0].message.content}")
        title, story, sentences = parse_story_json(response.choices[0].message.content.strip())
        #logging.info(f"Parsed JSON story: {story}")
        return title, story, sentences
    except Exception as e:
        logging.error(f"Grok error: {e}")
        return None, None, None 

async def generate_story_gemini(topic, api_key, story_length, story_style):
    try:
        genai.configure(api_key=api_key)
        prompt = create_story_prompt(topic, story_length, story_style)
        model = genai.GenerativeModel('gemini-1.5-flash') 
        response = model.generate_content(prompt)
        #logging.info(f"Raw response from Gemini: {response.text}")
        title, story, sentences = parse_story_json(response.text.strip())
        #logging.info(f"Parsed JSON story: {story}")
        return title, story, sentences
    except Exception as e:
        logging.error(f"Gemini error: {e}")
        return None, None, None
 
def create_story_prompt(topic, story_length="short", story_style="adventure"):
    """Creates the story prompt based on whether a topic is provided or not."""
    sentence_count = { "short": 5, "medium": 7, "long": 9, "epic": 12, "saga": 15}
    num_sentences = sentence_count.get(story_length, 5)
    if topic:
        prompt = f"""
        Write a {story_length}, imaginative and creative {num_sentences} sentence children's story suitable for young readers about {topic}. The story should have a happy ending and its style should be {story_style}...

            Please provide the response as a JSON object without any markdown elements or formatting. Format the story as a JSON object with each sentence as a separate entry in an array of sentences under the 'sentences' property. Additionally, generate a unique and creative title for the story and include it in a separate property called 'Title' in the JSON response object. DO NOT include any additional formatting or markdown.       
            Crucially, EVERY sentence must include these details:
            * **Central Character:**  Always mention the main character by name. Provide a detailed description of their appearance, personality, attire, accessories, and any unique attributes like clothing, toys, skin color, hair/fur color,etc in EVERY sentence. Use vivid language and sensory details. Ensure these details remain consistent across all sentences in which the central character appears.  Be extremely repetitive with explicit details.
            * **Scene:**  Vividly describe the setting in EVERY sentence, including the time of day, weather, and specific details about the environment. Use descriptive language to create a strong visual image. Ensure these details remain consistent across all sentences.  If the scene changes, the same rule applies for the new scene as well.  Be extremely repetitive with explicit details.
            * **Supporting Characters:** Describe any supporting characters in detail, including their appearance, personality, and relationship to the main character. Ensure these details remain consistent across all sentences in which the supporting characters appear. Be extremely repetitive with explicit details.
            * **Objects/Items:** Describe any objects or items or artifacts that appear in the scene in detail, including their appearance, function, and significance to the story. Ensure these details remain consistent across all sentences in which the objects/items appear. Be extremely repetitive with explicit details

            Example:
            "Luna, a curious little fox with a fluffy, silver-gray coat, bright, inquisitive eyes, and a shimmering blue bow around her neck, tiptoed through the moonlit forest, her heart full of wonder and excitement.",
            "The cool night breeze rustled the leaves of the ancient, towering trees, casting dancing shadows on the forest floor, as Luna, the curious little fox with a fluffy, silver-gray coat, bright, inquisitive eyes, and a shimmering blue bow around her neck, followed a trail of sparkling dust to a hidden clearing.",
            "In the clearing stood a magical tree adorned with glowing crystals, and beside it, a wise old owl with soft, cloud-like feathers and twinkling, ancient eyes, greeted Luna, the curious little fox with a fluffy, silver-gray coat, bright, inquisitive eyes, and a shimmering blue bow around her neck, with a warm smile.",
            "Luna, the curious little fox with a fluffy, silver-gray coat, bright, inquisitive eyes, and a shimmering blue bow around her neck, discovered an ornate, golden key lying among the soft, mossy ground, its intricate design glinting in the silver moonlight, as the wise old owl with soft, cloud-like feathers and twinkling, ancient eyes watched over her.",
            "With the help of the wise old owl with soft, cloud-like feathers and twinkling, ancient eyes, Luna, the curious little fox with a fluffy, silver-gray coat, bright, inquisitive eyes, and a shimmering blue bow around her neck, used the golden key to unlock a hidden door in the magical tree, revealing a wondrous world filled with friendship and adventure, where she knew she would always be happy and safe."
            and so on...  Every sentence must mention ALL relevant characters and FULL scene details. Ensure no details are left out in any sentence
            """
    else:
        prompt = """
        Write a random {story_length}, imaginative and creative {num_sentences} sentence children's story suitable for young readers. The story should have a happy ending and its style should be {story_style}...  

            Please provide the response as a JSON object without any markdown elements or formatting. Format the story as a JSON object with each sentence as a separate entry in an array of sentences under the 'sentences' property. Additionally, generate a unique and creative title for the story and include it in a separate property called 'Title' in the JSON response object. DO NOT include any additional formatting or markdown.       
            Crucially, EVERY sentence must include these details:
            * **Central Character:**  Always mention the main character by name. Provide a detailed description of their appearance, personality, attire, accessories, and any unique attributes like clothing, toys, skin color, hair/fur color,etc in EVERY sentence. Use vivid language and sensory details. Ensure these details remain consistent across all sentences in which the central character appears.  Be extremely repetitive with explicit details.
            * **Scene:**  Vividly describe the setting in EVERY sentence, including the time of day, weather, and specific details about the environment. Use descriptive language to create a strong visual image. Ensure these details remain consistent across all sentences.  If the scene changes, the same rule applies for the new scene as well.  Be extremely repetitive with explicit details.
            * **Supporting Characters:** Describe any supporting characters in detail, including their appearance, personality, and relationship to the main character. Ensure these details remain consistent across all sentences in which the supporting characters appear. Be extremely repetitive with explicit details.
            * **Objects/Items:** Describe any objects or items or artifacts that appear in the scene in detail, including their appearance, function, and significance to the story. Ensure these details remain consistent across all sentences in which the objects/items appear. Be extremely repetitive with explicit details

            Example:
            "Luna, a curious little fox with a fluffy, silver-gray coat, bright, inquisitive eyes, and a shimmering blue bow around her neck, tiptoed through the moonlit forest, her heart full of wonder and excitement.",
            "The cool night breeze rustled the leaves of the ancient, towering trees, casting dancing shadows on the forest floor, as Luna, the curious little fox with a fluffy, silver-gray coat, bright, inquisitive eyes, and a shimmering blue bow around her neck, followed a trail of sparkling dust to a hidden clearing.",
            "In the clearing stood a magical tree adorned with glowing crystals, and beside it, a wise old owl with soft, cloud-like feathers and twinkling, ancient eyes, greeted Luna, the curious little fox with a fluffy, silver-gray coat, bright, inquisitive eyes, and a shimmering blue bow around her neck, with a warm smile.",
            "Luna, the curious little fox with a fluffy, silver-gray coat, bright, inquisitive eyes, and a shimmering blue bow around her neck, discovered an ornate, golden key lying among the soft, mossy ground, its intricate design glinting in the silver moonlight, as the wise old owl with soft, cloud-like feathers and twinkling, ancient eyes watched over her.",
            "With the help of the wise old owl with soft, cloud-like feathers and twinkling, ancient eyes, Luna, the curious little fox with a fluffy, silver-gray coat, bright, inquisitive eyes, and a shimmering blue bow around her neck, used the golden key to unlock a hidden door in the magical tree, revealing a wondrous world filled with friendship and adventure, where she knew she would always be happy and safe."
            and so on...  Every sentence must mention ALL relevant characters and FULL scene details. Ensure no details are left out in any sentence
            """
    return prompt

def parse_story_json(story_response):
    try:
        if story_response.startswith('```json') and story_response.endswith('```'):
            # Remove markdown elements
            story_response = story_response.lstrip('```json\n').rstrip('```')
        story_json = json.loads(story_response)  
        title = story_json['Title']
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
            return None, None, None

        story = ' '.join(sentences)  # Use space as separator for simplified story
        return title, story, sentences # Return both complete story and list of sentences
    except (json.JSONDecodeError, KeyError, TypeError) as e:  # Handle JSON and KeyError if sentences is not present
        logging.error(f"Invalid or empty JSON response: {story_response}")
        logging.error(f"JSON parsing error: {e}")  # Log the specific exception
        return None, None, None  # Return None for both to indicate failure

async def simplify_story_with_gemini(detailed_story, api_key, story_length = "short"):
    try:
        sentence_count = { "short": 5, "medium": 7, "long": 9, "epic": 12, "saga": 15}
        num_sentences = sentence_count.get(story_length, 5)
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash') 
        prompt = f"""
        Here's a children's story: {detailed_story}
        Please simplify the story into {num_sentences} sentences, removing repetitive descriptions while maintaining the same narrative. Make the sentences as long and descriptive as possible while keeping the essence and key elements of the story intact.
        """
        #logging.info(f"Simplified story prompt:\n{prompt}")
        response = model.generate_content(prompt)
        simplified_story = response.text.strip()
        #logging.info(f"Simplified story:\n{simplified_story}")
        return simplified_story

    except Exception as e:
        logging.error(f"Error simplifying story: {e}")
        return detailed_story  # Return original story if simplification fails

async def simplify_story(detailed_story, api_key, story_length = "short"):
    try:
        sentence_count = { "short": 5, "medium": 7, "long": 9, "epic": 12, "saga": 15}
        num_sentences = sentence_count.get(story_length, 5)
        client = openai.OpenAI(api_key=api_key) # Or use Gemini. Configure appropriately
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Suitable model for simplification
            messages=[
                {"role": "system", "content": "You are a helpful assistant that simplifies text."},
                {"role": "user", "content": f"Please simplify the above story into {num_sentences} sentences, removing repetitive descriptions while maintaining the same narrative. Make the sentences as long and descriptive as possible while keeping the essence and key elements of the story intact.:\n\n{detailed_story}"}

            ],
            max_tokens=300 # Adjust if needed
        )
        simplified_story = response.choices[0].message.content
        #logging.info(f"Simplified story:\n{simplified_story}")
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
        "negative_prompt": "ugly, blurry, distorted, text, watermark, extra limbs, extra body parts",
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

async def generate_image_flux_pro(prompt):
    try:
        output = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: replicate.run(
                "black-forest-labs/flux-1.1-pro",
                input={
                    "prompt": prompt,
                    "aspect_ratio": "1:1",
                    "output_format": "webp",
                    "output_quality": 100,
                    "safety_tolerance": 1,
                    "prompt_upsampling": False
                }
            )
        )
        logging.info(f"Output : {output} " )
        image_url = output
        logging.info(f"Generated image (Flux Pro): {image_url}")  
        return image_url, prompt  
    except Exception as e:
        logging.error(f"Flux Pro error: {e}")
        return None, prompt

async def generate_image_google_imagen(prompt, api_key):
    try:
        genai.configure(api_key=api_key)
        model = genai.ImageGenerationModel("imagen-3.0-generate-001")
        output = await model.generate_images(
            prompt=prompt,
            number_of_images=1,
            safety_filter_level="block_only_high",
            person_generation="allow_adult",
            aspect_ratio="1:1",
            negative_prompt="Outside, Text, Distorted",
        )
        image_url = output.image_url
        logging.info(f"Generated image (Google Imagen 3 Fast): {image_url}")
        return image_url, prompt
    except Exception as e:
        logging.error(f"Google Imagen 3 Fast error: {e}")
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
    expiry_time = now + timedelta(minutes=5)
    
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

async def get_secrets() -> Config:
    """Get secrets from Key Vault or environment variables"""
    try:
        key_vault_uri = os.environ.get("KEY_VAULT_URI")
        if key_vault_uri:
            credential = DefaultAzureCredential()
            client = SecretClient(vault_url=key_vault_uri, credential=credential)
            
            secrets = await asyncio.gather(
                asyncio.to_thread(client.get_secret, "openai-api-key"),
                asyncio.to_thread(client.get_secret, "gemini-api-key"),
                asyncio.to_thread(client.get_secret, "replicate-api-token"),
                asyncio.to_thread(client.get_secret, "storage-connection-string"),
                asyncio.to_thread(client.get_secret, "account-key"),
                asyncio.to_thread(client.get_secret, "account-name"),
                asyncio.to_thread(client.get_secret, "grok-api-key"),
                asyncio.to_thread(client.get_secret, "b2c-client-id"),
                asyncio.to_thread(client.get_secret, "b2c-tenant"),
                asyncio.to_thread(client.get_secret, "b2c-user-flow")
            )
            logging.info("Secrets successfully fetched from Key Vault") # Add logging for successful fetch.
            return Config(*(s.value for s in secrets))
        
        # Fallback to environment variables
        logging.warning("Key Vault URI not found. Falling back to environment variables.")
        return Config(
            openai_key=os.environ["OPENAI_API_KEY"],
            gemini_key=os.environ["GEMINI_API_KEY"],
            replicate_token=os.environ["REPLICATE_API_TOKEN"],
            storage_conn=os.environ["STORAGE_CONNECTION_STRING"],
            account_key=os.environ["ACCOUNT_KEY"],
            account_name=os.environ["ACCOUNT_NAME"],
            grok_key=os.environ["GROK_API_KEY"],
            b2c_client_id=os.environ["B2C_CLIENT_ID"],
            b2c_tenant=os.environ["B2C_TENANT"],
            b2c_user_flow=os.environ["B2C_USER_FLOW"]
        )   
    except Exception as e:
        logging.exception(f"Error getting secrets: {e}") # Log the exception
        raise

async def generate_images_parallel(sentences, story_title, image_style, connection_string, account_key, account_name, image_model, unique_id, gemini_api_key=None):
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i, sentence in enumerate(sentences):
            detailed_prompt, _ = construct_detailed_prompt(sentence, image_style)
            async def generate_and_save_image(prompt,index):
                if image_model == 'flux_schnell':
                    image_url,prompt_used = await generate_image_flux_schnell(prompt)
                elif image_model == 'flux_pro':
                    image_url,prompt_used = await generate_image_flux_pro(prompt)
                elif image_model == 'stable_diffusion_3':
                    image_url,prompt_used = await generate_image_stable_diffusion(prompt)
                elif image_model == 'imagen_3':
                    image_url,prompt_used = await generate_image_google_imagen(detailed_prompt, gemini_api_key)
                    if not image_url:
                        return None
                try:
                    async with session.get(image_url) as response:
                        image_data = await response.read()
                        image_filename = f"{story_title}_{unique_id}-image{index+1}.png"
            
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
                    logging.error(f"Error processing images : {e}")
            tasks.append(generate_and_save_image(detailed_prompt, i))   
        results = await asyncio.gather(*tasks)
        ordered_results = [None] * len(sentences)
        for i, result in enumerate(results):
            if result is not None:
                ordered_results[i] = result
        return [result for result in ordered_results if result is not None]

async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        # Get secrets (existing code)
        config = await get_secrets()

        # Initialize auth middleware if not already done
        global auth_middleware
        if auth_middleware is None:
            auth_middleware = await initialize_auth(config)
            if auth_middleware is None:
                return HttpResponse(
                    json.dumps({"error": "Failed to initialize authentication middleware"}),
                    mimetype="application/json",
                    status_code=500
                )
            
        openai.api_key = config.openai_key
        os.environ["REPLICATE_API_TOKEN"] = config.replicate_token

        
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

        # Get story and image generation models
        story_model = req.params.get('storyModel', 'gemini')
        if not story_model:
            try:
                req_body = req.get_json()
                story_model = req_body.get('storyModel', 'gemini')
            except ValueError:
                story_model = 'gemini'

        image_model = req.params.get('imageModel', 'flux_schnell')
        if not image_model:
            try:
                req_body = req.get_json()
                image_model = req_body.get('imageModel', 'flux_schnell')
            except ValueError:
                image_model = 'flux-schnell'
        
        story_style = req.params.get('storyStyle', 'adventure')
        if not story_style:
            try:
                req_body = req.get_json()
                story_style = req_body.get('storyStyle', 'adventure')
            except ValueError:
                story_style = 'adventure'

        # Generate story using the specified model
        logging.info(f"Generating story with model: {story_model}")
        if story_model == 'gemini':
            title, story, sentences = await generate_story_gemini(topic, config.gemini_key, story_length, story_style)
        elif story_model == 'openai':
            title, story, sentences = await generate_story_openai(topic, config.openai_key, story_length, story_style)
        elif story_model == 'grok':
            title, story, sentences = await generate_story_grok(topic, config.grok_key, story_length, story_style)
        else:
            return func.HttpResponse(
                json.dumps({"error": f"Invalid story model: {story_model}"}),
                mimetype="application/json",
                status_code=400
            )

        if not story:
            return func.HttpResponse("Failed to generate story", status_code=500)

        # Generate story title and filenames
        unique_id = str(uuid.uuid4())
        simplified_story_filename = f"{title}_{unique_id}.txt"
        detailed_story_filename = f"{title}_{unique_id}_detailed.txt"

        # Simplify story
        logging.info(f"Simplifying story with an OpenAI call")
        simplified_story = await simplify_story(story, config.openai_key, story_length)
        #logging.info(f"Simplifying story with an Gemini call")
        #simplified_story = await simplify_story_with_gemini(story, config.gemini_key, story_length)

        # Save stories to blob storage in parallel
        logging.info(f"Saving stories to blob storage")
        with ThreadPoolExecutor() as executor:
            simplified_future = executor.submit(
                save_to_blob_storage, 
                simplified_story, "text/plain", 
                STORY_CONTAINER_NAME, 
                simplified_story_filename, 
                config.storage_conn
            )
            detailed_future = executor.submit(
                save_to_blob_storage,
                story, "text/plain",
                STORY_CONTAINER_NAME,
                detailed_story_filename,
                config.storage_conn
            )
            
            simplified_story_url = simplified_future.result()
            detailed_story_url = detailed_future.result()

        if not all([simplified_story_url, detailed_story_url]):
            return func.HttpResponse("Failed to upload stories to blob storage", status_code=500)

        # Generate images using the specified model
        logging.info(f"Generating images with model: {image_model}")
        if image_model == 'flux_schnell':
            image_results = await generate_images_parallel(
                sentences, title, image_style,
                config.storage_conn, config.account_key, config.account_name, image_model, unique_id
            )
        elif image_model == 'flux_pro':
            image_results = await generate_images_parallel(
                sentences, title, image_style,
                config.storage_conn, config.account_key, config.account_name, image_model, unique_id
            )
        elif image_model == 'stable_diffusion_3':
            image_results = await generate_images_parallel(
                sentences, title, image_style,
                config.storage_conn, config.account_key, config.account_name, image_model, unique_id
            )
        elif image_model == 'imagen_3':
            image_results = await generate_images_parallel(
                sentences, title, image_style,
                config.storage_conn, config.account_key, config.account_name, image_model, unique_id, config.gemini_key
            )
        else:
            return func.HttpResponse(
                json.dumps({"error": f"Invalid image model: {image_model}"}),
                mimetype="application/json",
                status_code=400
            ) 

        # Prepare response
        response_data = {
            "title": title,
            "StoryText": simplified_story,
            "storyUrl": simplified_story_url,
            "detailedStoryUrl": detailed_story_url,
            "images": image_results,
            "imageContainerName": IMAGE_CONTAINER_NAME,
            "blobStorageConnectionString": config.storage_conn
        }

        return func.HttpResponse(
            json.dumps(response_data, default=str),
            mimetype="application/json",
            status_code=200
        )

    except Exception as e:
        logging.exception(f"Error: {e}")
        return func.HttpResponse(f"Error during execution: {str(e)}", status_code=500)