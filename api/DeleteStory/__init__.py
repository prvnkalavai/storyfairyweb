import logging
import json
import azure.functions as func
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
import os
from ..shared.auth.decorator import require_auth
from ..shared.services.cosmos_service import CosmosService

@require_auth
async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        # Get user ID from auth claims
        claims = getattr(req, 'auth_claims')
        user_id = claims.get('sub') or claims.get('oid') or claims.get('name')

        if not user_id:
            return func.HttpResponse(
                json.dumps({"error": "User not authenticated"}),
                status_code=401,
                mimetype="application/json"
            )

        # Get story ID from request
        story_id = req.params.get('storyId')
        if not story_id:
            return func.HttpResponse(
                json.dumps({"error": "Story ID is required"}),
                status_code=400,
                mimetype="application/json"
            )

        # Initialize services
        cosmos_service = CosmosService()

        # Get story details to verify ownership and get blob references
        story = await cosmos_service.get_story_by_id(story_id, user_id)
        if not story:
            return func.HttpResponse(
                json.dumps({"error": "Story not found or unauthorized"}),
                status_code=404,
                mimetype="application/json"
            )

        # Delete story from Cosmos DB
        deleted = await cosmos_service.delete_story(story_id, user_id)
        if not deleted:
            return func.HttpResponse(
                json.dumps({"error": "Failed to delete story"}),
                status_code=500,
                mimetype="application/json"
            )

        # Delete associated blobs using managed identity
        try:
            account_name = os.environ["ACCOUNT_NAME"]
            blob_service_url = f"https://{account_name}.blob.core.windows.net"
            credential = DefaultAzureCredential()
            blob_service_client = BlobServiceClient(blob_service_url, credential=credential)

            # Delete story text blobs
            story_container = blob_service_client.get_container_client("storyfairy-stories")
            if story.get("storyUrl"):
                story_blob_name = story["storyUrl"].split("/")[-1].split("?")[0]
                story_container.delete_blob(story_blob_name)
            if story.get("detailedStoryUrl"):
                detailed_story_blob_name = story["detailedStoryUrl"].split("/")[-1].split("?")[0]
                story_container.delete_blob(detailed_story_blob_name)

            # Delete image blobs
            image_container = blob_service_client.get_container_client("storyfairy-images")
            for image in story.get("images", []):
                if image.get("imageUrl"):
                    image_blob_name = image["imageUrl"].split("/")[-1].split("?")[0]
                    image_container.delete_blob(image_blob_name)

            # Delete cover images
            for cover in story.get("coverImages", {}).values():
                if cover.get("url"):
                    cover_blob_name = cover["url"].split("/")[-1].split("?")[0]
                    image_container.delete_blob(cover_blob_name)

        except Exception as e:
            logging.error(f"Error deleting blobs: {str(e)}")
            # Continue even if blob deletion fails
            pass

        return func.HttpResponse(
            json.dumps({"message": "Story deleted successfully"}),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as error:
        logging.error(f'Error in DeleteStory: {str(error)}')
        return func.HttpResponse(
            json.dumps({"error": str(error)}),
            status_code=500,
            mimetype="application/json"
        )