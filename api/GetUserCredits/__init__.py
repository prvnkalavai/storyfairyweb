import logging
import json
import os
import azure.functions as func
from ..shared.services.credit_service import CreditService
from ..shared.auth.decorator import require_auth

@require_auth
async def main(req: func.HttpRequest) -> func.HttpResponse:
  try:
      # Get the claims from the request object (set by the decorator)
      claims = getattr(req, 'auth_claims')
      logging.info(f"Token Claims: {claims}")
      user_id = claims.get('sub') or claims.get('oid') or claims.get('name')
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