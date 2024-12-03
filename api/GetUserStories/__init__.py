import logging
import json
import azure.functions as func
from ..shared.auth.decorator import require_auth
from ..shared.services.cosmos_service import CosmosService
from azure.storage.blob import generate_blob_sas, BlobSasPermissions, __version__
from datetime import datetime, timedelta
import os
import pytz

def generate_sas_token(account_name, account_key, container_name, blob_name, api_version="2022-11-02"):
    """Generates a SAS token for a blob"""
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
        version=api_version
    )
    return sas_token

def add_sas_token_to_url(url, account_name, account_key, container_name):
    """Adds SAS token to a blob URL"""
    if not url:
        return url
    
    try:
        blob_name = url.split(f'{container_name}/')[1]
        sas_token = generate_sas_token(account_name, account_key, container_name, blob_name, "2022-11-02")
        return f"{url}?{sas_token}"
    except Exception as e:
        logging.error(f"Error generating SAS token for URL {url}: {e}")
        return url

@require_auth
async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        # Get user ID from auth claims
        claims = getattr(req, 'auth_claims')
        user_id = claims.get('sub') or claims.get('oid') or claims.get('name')
        logging.info(f'User ID from auth claims: {user_id}')

        if not user_id:
            return func.HttpResponse(
                json.dumps({"error": "User not authenticated"}),
                status_code=401,
                mimetype="application/json"
            )

        # Get storage account credentials from environment variables
        account_name = os.environ["ACCOUNT_NAME"]
        account_key = os.environ["ACCOUNT_KEY"]
        image_container_name = "storyfairy-images"

        # Get query parameters
        page_size = int(req.params.get('pageSize', 10))

        # Initialize CosmosService
        cosmos_service = CosmosService()

        # Get stories with pagination
        result = await cosmos_service.get_user_stories(
            user_id=user_id,
            page_size=page_size
        )

        # Process each story to add SAS tokens to cover image URLs
        processed_stories = []
        for story in result["stories"]:
            cover_images = story.get("coverImages", {})
            # Process front cover
            if cover_images.get("frontCover"):
                front_url = cover_images["frontCover"].get("url")
                if front_url:
                    cover_images["frontCover"]["url"] = add_sas_token_to_url(
                        front_url, 
                        account_name, 
                        account_key, 
                        image_container_name
                    )
            
            processed_story = {
                "id": story["id"],
                "title": story["title"],
                "createdAt": story["createdAt"],
                "coverImages": cover_images,
                "metadata": story.get("metadata", {})
            }
            processed_stories.append(processed_story)

        # Format response
        response = {
            "stories": processed_stories
        }

        return func.HttpResponse(
            json.dumps(response),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as error:
        logging.error(f'Error in GetUserStories: {str(error)}')
        return func.HttpResponse(
            json.dumps({"error": str(error)}),
            status_code=500,
            mimetype="application/json"
        )