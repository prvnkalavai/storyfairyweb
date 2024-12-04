# api/GetBlob/__init__.py
import logging
import azure.functions as func
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceNotFoundError
import os

async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        blob_name = req.route_params.get('blob_name')
        container_name = req.params.get('container', 'storyfairy-images')

        if not blob_name:
            return func.HttpResponse("Blob name is required", status_code=400)

        # Log configuration details
        account_name = os.environ.get("ACCOUNT_NAME")
        if not account_name:
            logging.error("ACCOUNT_NAME environment variable is not set")
            return func.HttpResponse(
                "Storage account configuration missing",
                status_code=500
            )

        logging.info(f"Attempting to access blob: {blob_name} in container: {container_name}")

        # Initialize credentials with detailed logging
        try:
            credential = DefaultAzureCredential(logging_enable=True)
            blob_service_client = BlobServiceClient(
                f"https://{account_name}.blob.core.windows.net",
                credential=credential
            )
            logging.info("Successfully created BlobServiceClient")
        except Exception as auth_error:
            logging.error(f"Authentication error: {str(auth_error)}")
            return func.HttpResponse(
                "Failed to authenticate with storage account",
                status_code=500
            )

        try:
            # Get blob client
            container_client = blob_service_client.get_container_client(container_name)
            blob_client = container_client.get_blob_client(blob_name)

            # Verify blob exists
            if not blob_client.exists():
                logging.warning(f"Blob {blob_name} not found")
                return func.HttpResponse(
                    "Blob not found",
                    status_code=404
                )

            # Download blob
            blob_data = blob_client.download_blob()
            content_type = blob_client.get_blob_properties().content_settings.content_type

            logging.info(f"Successfully retrieved blob: {blob_name}")

            # Return blob content
            return func.HttpResponse(
                blob_data.readall(),
                mimetype=content_type
            )

        except ResourceNotFoundError as not_found_error:
            logging.error(f"Resource not found: {str(not_found_error)}")
            return func.HttpResponse(
                "Resource not found",
                status_code=404
            )
        except Exception as blob_error:
            logging.error(f"Error accessing blob: {str(blob_error)}")
            return func.HttpResponse(
                "Error accessing blob",
                status_code=500
            )

    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        return func.HttpResponse(
            "Internal server error",
            status_code=500
        )