# api/GetTransactionHistory/__init__.py
import logging
import json
import azure.functions as func
from ..shared.auth.decorator import require_auth
from ..shared.services.credit_service import CreditService

@require_auth
async def main(req: func.HttpRequest) -> func.HttpResponse:
  try:
      claims = getattr(req, 'auth_claims')
      user_id = claims.get('sub') or claims.get('oid') or claims.get('name')

      credit_service = CreditService()
      transactions = await credit_service.get_user_transactions(user_id)

      return func.HttpResponse(
          json.dumps({"transactions": transactions}),
          status_code=200,
          mimetype="application/json"
      )

  except Exception as error:
      logging.error(f'Error in GetTransactionHistory: {str(error)}')
      return func.HttpResponse(
          json.dumps({"error": str(error)}),
          status_code=500,
          mimetype="application/json"
      )