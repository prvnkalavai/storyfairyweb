# api/GetBlob/__init__.py
import logging
import azure.functions as func
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
import os

async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        blob_name = req.route_params.get('blob_name')
        container_name = req.params.get('container', 'storyfairy-images')

        if not blob_name:
            return func.HttpResponse("Blob name is required", status_code=400)

        # Use managed identity to access blob storage
        account_name = os.environ["ACCOUNT_NAME"]
        credential = DefaultAzureCredential()
        blob_service_client = BlobServiceClient(
            f"https://{account_name}.blob.core.windows.net",
            credential=credential
        )

        # Get blob client
        container_client = blob_service_client.get_container_client(container_name)
        blob_client = container_client.get_blob_client(blob_name)

        # Download blob
        blob_data = blob_client.download_blob()
        content_type = blob_client.get_blob_properties().content_settings.content_type

        # Return blob content
        return func.HttpResponse(
            blob_data.readall(),
            mimetype=content_type
        )

    except Exception as e:
        logging.error(f"Error retrieving blob: {str(e)}")
        return func.HttpResponse(
            "Error retrieving image",
            status_code=500
        )