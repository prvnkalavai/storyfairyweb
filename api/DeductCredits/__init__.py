import logging
import json
import azure.functions as func
from ..shared.services.credit_service import CreditService
from ..shared.auth.decorator import require_auth

@require_auth
async def main(req: func.HttpRequest) -> func.HttpResponse:
  try:
      # Get claims from the request object (set by the decorator)
      claims = getattr(req, 'auth_claims')
      #logging.info(f"Token Claims: {claims}")
      user_id = claims.get('sub') or claims.get('oid') or claims.get('name')

      if not user_id:
          raise ValueError("User ID not found in token claims")

      # Get request body
      try:
          body = req.get_json()
      except ValueError:
          return func.HttpResponse(
              json.dumps({"error": "Invalid request body"}),
              status_code=400,
              mimetype="application/json",
              headers={
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              }
          )

      amount = body.get('amount')
      if not amount or amount <= 0:
          return func.HttpResponse(
              json.dumps({"error": "Invalid amount"}),
              status_code=400,
              mimetype="application/json",
              headers={
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              }
          )

      logging.info(f"Processing request for user_id: {user_id}")
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
              mimetype="application/json",
              headers={
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              }
          )

      except ValueError as ve:
          if str(ve) == 'Insufficient credits':
              return func.HttpResponse(
                  json.dumps({"error": "Insufficient credits"}),
                  status_code=402,
                  mimetype="application/json",
                  headers={
                      'Access-Control-Allow-Origin': '*',
                      'Access-Control-Allow-Methods': 'POST, OPTIONS',
                      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                  }
              )
          raise

  except Exception as error:
      logging.error(f'Error in DeductCredits: {str(error)}')
      return func.HttpResponse(
          json.dumps({"error": str(error)}),
          status_code=500,
          mimetype="application/json",
          headers={
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
      )