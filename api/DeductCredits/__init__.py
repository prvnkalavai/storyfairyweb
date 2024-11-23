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

      # Validate token
      token = auth_middleware.get_token_from_header(req)
      if not token:
          return func.HttpResponse(
              json.dumps({"error": "No authorization token provided"}),
              status_code=401,
              mimetype="application/json"
          )

      claims = auth_middleware.validate_token(token)
      user_id = claims['sub']

      # Get request body
      try:
          body = req.get_json()
      except ValueError:
          return func.HttpResponse(
              json.dumps({"error": "Invalid request body"}),
              status_code=400,
              mimetype="application/json"
          )

      amount = body.get('amount')
      if not amount or amount <= 0:
          return func.HttpResponse(
              json.dumps({"error": "Invalid amount"}),
              status_code=400,
              mimetype="application/json"
          )

      credit_service = CreditService()
      try:
          new_balance = await credit_service.deduct_credits(
              user_id=user_id,
              amount=amount,
              description=body.get('description', 'Credit deduction')
          )

          return func.HttpResponse(
              json.dumps({"credits": new_balance}),
              status_code=200,
              mimetype="application/json"
          )

      except ValueError as ve:
          if str(ve) == 'Insufficient credits':
              return func.HttpResponse(
                  json.dumps({"error": "Insufficient credits"}),
                  status_code=402,
                  mimetype="application/json"
              )
          raise

  except Exception as error:
      logging.error(f'Error in DeductCredits: {str(error)}')
      return func.HttpResponse(
          json.dumps({"error": str(error)}),
          status_code=500,
          mimetype="application/json"
      )