# api/GetBlob/__init__.py
import logging
import azure.functions as func
from azure.storage.blob import BlobServiceClient
from azure.core.credentials import TokenCredential
from azure.core.exceptions import ResourceNotFoundError
import os
import json
import urllib.request

class StaticWebAppCredential(TokenCredential):
    def __init__(self):
        super().__init__()
        self.identity_endpoint = os.environ.get("IDENTITY_ENDPOINT")
        self.identity_header = os.environ.get("IDENTITY_HEADER")
        
        # Log environment variables for debugging
        logging.info(f"IDENTITY_ENDPOINT: {self.identity_endpoint}")
        logging.info(f"IDENTITY_HEADER: {bool(self.identity_header)}")  # Log presence, not value

    def get_token(self, *scopes, **kwargs):
        if not self.identity_endpoint or not self.identity_header:
            error_msg = "Identity endpoint or header is missing. Check environment configuration."
            logging.error(error_msg)
            raise ValueError(error_msg)

        # Explicitly log the scopes being requested
        logging.info(f"Requesting token for scopes: {scopes}")

        request = urllib.request.Request(
            f"{self.identity_endpoint}?api-version=2019-08-01&resource=https://storage.azure.com/",
            headers={
                "X-IDENTITY-HEADER": self.identity_header,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )

        try:
            response = urllib.request.urlopen(request)
            token_response = json.loads(response.read().decode())
            
            # Add extensive logging for token retrieval
            logging.info("Token successfully retrieved")
            logging.debug(f"Token expires on: {token_response.get('expires_on')}")

            return {
                "token": token_response["access_token"],
                "expires_on": token_response.get("expires_on", 0)
            }
        except urllib.error.URLError as url_error:
            # More detailed error logging
            logging.error(f"URL Error during token retrieval: {url_error}")
            logging.error(f"Error reason: {url_error.reason}")
            raise
        except json.JSONDecodeError as json_error:
            logging.error(f"JSON Decode Error: {json_error}")
            raise
        except Exception as e:
            logging.error(f"Unexpected error during token retrieval: {str(e)}")
            raise

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

        try:
            credential = StaticWebAppCredential()
            logging.info("Created StaticWebAppCredential")

            account_url = f"https://{account_name}.blob.core.windows.net"
            logging.info(f"Creating BlobServiceClient with account URL: {account_url}")

            blob_service_client = BlobServiceClient(account_url,credential=credential)
            logging.info("Successfully created BlobServiceClient")

            # Test the connection
            containers = list(blob_service_client.list_containers(max_results=1))
            logging.info("Successfully listed containers")

        except Exception as auth_error:
            logging.error(f"Authentication error details: {str(auth_error)}")
            return func.HttpResponse(f"Failed to authenticate with storage account: {str(auth_error)}",
            status_code=500
            )

        try:
            container_client = blob_service_client.get_container_client(container_name)
            blob_client = container_client.get_blob_client(blob_name)

            if not blob_client.exists():
                logging.warning(f"Blob {blob_name} not found")
                return func.HttpResponse(
                    "Blob not found",
                    status_code=404
                )

            blob_data = blob_client.download_blob()
            content_type = blob_client.get_blob_properties().content_settings.content_type

            logging.info(f"Successfully retrieved blob: {blob_name}")

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