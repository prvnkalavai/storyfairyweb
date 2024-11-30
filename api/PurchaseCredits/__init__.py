# api/PurchaseCredits/__init__.py
import logging
import json
import os
import stripe
import azure.functions as func
from ..shared.auth.decorator import require_auth
from ..shared.services.credit_service import CreditService

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

@require_auth
async def main(req: func.HttpRequest) -> func.HttpResponse:
  try:
      claims = getattr(req, 'auth_claims')
      user_id = claims.get('sub') or claims.get('oid') or claims.get('name')

      try:
          body = req.get_json()
      except ValueError:
          return func.HttpResponse(
              json.dumps({"error": "Invalid request body"}),
              status_code=400,
              mimetype="application/json"
          )

      package_id = body.get('packageId')
      logging.info(f'Package ID: {package_id}')

      if not package_id:
          return func.HttpResponse(
              json.dumps({"error": "Package ID is required"}),
              status_code=400,
              mimetype="application/json"
          )

      # Create Stripe checkout session
      session = stripe.checkout.Session.create(
          payment_method_types=['card'],
          line_items=[{
              'price': package_id,  # Stripe price ID
              'quantity': 1,
          }],
          mode='payment',
          success_url=f"http://localhost:3000",
          cancel_url=f"http://localhost:3000/payment-cancelled",
          client_reference_id=user_id,
          metadata={
              'user_id': user_id
          }
      )

      return func.HttpResponse(
          json.dumps({"sessionId": session.id}),
          status_code=200,
          mimetype="application/json"
      )

  except Exception as error:
      logging.error(f'Error in PurchaseCredits: {str(error)}')
      return func.HttpResponse(
          json.dumps({"error": str(error)}),
          status_code=500,
          mimetype="application/json"
      )