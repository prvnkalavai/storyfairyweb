import logging
import os
import azure.functions as func
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential  
from azure.core.exceptions import ResourceNotFoundError 


async def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("GetBlob function triggered.")  

    try:
        blob_name = req.route_params.get('blob_name')
        container_name = req.params.get('container', 'storyfairy-images') 

        if not blob_name:
            return func.HttpResponse(
                "Blob name is required.", status_code=400
            )


        # Get account name from app settings.  No longer from .env. 
        account_name = os.environ.get("ACCOUNT_NAME")  

        if not account_name:
            logging.error("Storage account name not configured.")  
            return func.HttpResponse(
                "Storage account configuration missing.", status_code=500
            )


        account_url = f"https://{account_name}.blob.core.windows.net"
        try:
            credential = DefaultAzureCredential() 
            blob_service_client = BlobServiceClient(account_url, credential=credential)

            # (Optional) Test connection and log. This is usually not necessary unless you need to verify access to containers.
            containers = list(blob_service_client.list_containers(max_results=1))
            logging.info("Successfully listed containers.")

        except Exception as auth_error:
            logging.exception("Authentication error accessing storage account: %s", auth_error) 
            return func.HttpResponse(f"Failed to authenticate with storage account: {str(auth_error)}", status_code=500)
        
        try:
            container_client = blob_service_client.get_container_client(container_name)
            blob_client = container_client.get_blob_client(blob_name)  

            if not blob_client.exists():  
                logging.warning(f"Blob {blob_name} not found")  
                return func.HttpResponse(
                    "Blob not found", status_code=404
                )

            blob_data = blob_client.download_blob()  

            return func.HttpResponse(
                blob_data.readall(), 
                mimetype=blob_data.properties.content_type,  

                status_code=200  
            )

        
        except ResourceNotFoundError as not_found_error:

            return func.HttpResponse("Resource not found", status_code=404)
        except Exception as blob_error:

            return func.HttpResponse("Error accessing blob", status_code=500)

    except Exception as e: 
        logging.exception("An unexpected error occurred: %s", e)  
        return func.HttpResponse(
            "Internal server error", status_code=500
        )