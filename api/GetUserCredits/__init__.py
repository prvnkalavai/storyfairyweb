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
      logging.info("Auth middleware initialized")

      # Validate token
      token = auth_middleware.get_token_from_header(req)
      if not token:
          logging.error("No authorization token provided")
          return func.HttpResponse(
              json.dumps({"error": "No authorization token provided"}),
              status_code=401,
              mimetype="application/json",
              headers={
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              }
          )

      try:
          claims = auth_middleware.validate_token(token)
          logging.info("Token validated successfully")
      except ValueError as ve:
          logging.error(f"Token validation error: {str(ve)}")
          return func.HttpResponse(
              json.dumps({"error": str(ve)}),
              status_code=401,
              mimetype="application/json",
              headers={
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              }
          )

      user_id = claims['sub']
      logging.info(f"Processing request for user_id: {user_id}")

      credit_service = CreditService()
      credits = await credit_service.get_user_credits(user_id)

      return func.HttpResponse(
          json.dumps({"credits": credits}),
          status_code=200,
          mimetype="application/json",
          headers={
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
      )