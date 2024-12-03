import logging
import json
import azure.functions as func
from ..shared.auth.decorator import require_auth
from ..shared.services.cosmos_service import CosmosService
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
import os

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

        # Get storage account name from environment variables
        account_name = os.environ["ACCOUNT_NAME"]

        # Create BlobServiceClient using managed identity
        blob_service_url = f"https://{account_name}.blob.core.windows.net"
        credential = DefaultAzureCredential()
        blob_service_client = BlobServiceClient(blob_service_url, credential=credential)

        # Get query parameters
        page_size = int(req.params.get('pageSize', 10))

        # Initialize CosmosService
        cosmos_service = CosmosService()

        # Get stories with pagination
        result = await cosmos_service.get_user_stories(
            user_id=user_id,
            page_size=page_size
        )

        # Process each story to update image URLs
        processed_stories = []
        for story in result["stories"]:
            cover_images = story.get("coverImages", {})
            # Process front cover
            if cover_images.get("frontCover"):
                front_url = cover_images["frontCover"].get("url")
                if front_url:
                    # Use direct blob URL since we have managed identity access
                    cover_images["frontCover"]["url"] = front_url.split('?')[0]

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