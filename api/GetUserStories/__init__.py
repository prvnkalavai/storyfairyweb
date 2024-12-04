# api/GetUserStories/__init__.py
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
        claims = getattr(req, 'auth_claims')
        user_id = claims.get('sub') or claims.get('oid') or claims.get('name')

        if not user_id:
            return func.HttpResponse(
                json.dumps({"error": "User not authenticated"}),
                status_code=401,
                mimetype="application/json"
            )

        # Initialize services
        cosmos_service = CosmosService()
        page_size = int(req.params.get('pageSize', 10))

        # Get stories from Cosmos DB
        result = await cosmos_service.get_user_stories(user_id=user_id, page_size=page_size)

        # Process stories to use direct blob URLs (no SAS tokens needed with managed identity)
        processed_stories = []
        for story in result["stories"]:
            cover_images = story.get("coverImages", {})
            if cover_images.get("frontCover"):
                front_url = cover_images["frontCover"].get("url")
                if front_url:
                    # Create API URL for image proxy
                    blob_name = front_url.split("/")[-1]
                    cover_images["frontCover"]["url"] = f"/api/blob/{blob_name}?container=storyfairy-images"

            processed_story = {
                "id": story["id"],
                "title": story["title"],
                "createdAt": story["createdAt"],
                "coverImages": cover_images,
                "metadata": story.get("metadata", {})
            }
            processed_stories.append(processed_story)

        return func.HttpResponse(
            json.dumps({"stories": processed_stories}),
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