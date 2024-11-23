import logging
import json
import os
import azure.functions as func
from ..shared.services.credit_service import CreditService
from ..shared.auth.middleware import AuthMiddleware

async def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
      # Initialize auth middleware
        auth_middleware = AuthMiddleware(
          tenant=str(os.environ.get('REACT_APP_B2C_TENANT')),
          client_id=str(os.environ.get('REACT_APP_B2C_CLIENT_ID')),
          user_flow=str(os.environ.get('REACT_APP_B2C_USER_FLOW')),
          tenant_id=str(os.environ.get('REACT_APP_B2C_TENANT_ID'))
        )
        #logging.info("Auth middleware initialized successfully")
                
      # Validate token
        token = auth_middleware.get_token_from_header(req)
        logging.info(f"Token: {token}")
        if not token:
          return func.HttpResponse(
              json.dumps({"error": "No authorization token provided"}),
              status_code=401,
              mimetype="application/json"
          )

        claims = auth_middleware.validate_token(token)
        logging.info(f"Claims: {claims}")

        user_id = claims['sub']

        credit_service = CreditService()
        credits = await credit_service.get_user_credits(user_id)

        return func.HttpResponse(
          json.dumps({"credits": credits}),
          status_code=200,
          mimetype="application/json",
          headers={
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        )
    

    except Exception as error:
        logging.error(f'Error in GetUserCredits: {str(error)}')
        return func.HttpResponse(
          json.dumps({"error": str(error)}),
          status_code=500,
          mimetype="application/json",
          headers={
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        )