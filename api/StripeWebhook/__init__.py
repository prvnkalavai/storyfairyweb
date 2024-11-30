# api/StripeWebhook/__init__.py
import logging
import json
import os
import stripe
import azure.functions as func
from ..shared.services.credit_service import CreditService

stripe.api_key = os.environ.get('REACT_APP_STRIPE_SECRET_KEY')
webhook_secret = os.environ.get('REACT_APP_STRIPE_WEBHOOK_SECRET')

async def main(req: func.HttpRequest) -> func.HttpResponse:
  try:
      event = None
      payload = req.get_body()
      sig_header = req.headers.get('stripe-signature')

      try:
          event = stripe.Webhook.construct_event(
              payload, sig_header, webhook_secret
          )
      except ValueError as e:
          return func.HttpResponse(
              json.dumps({"error": "Invalid payload"}),
              status_code=400,
              mimetype="application/json"
          )
      except stripe.error.SignatureVerificationError as e:
          return func.HttpResponse(
              json.dumps({"error": "Invalid signature"}),
              status_code=400,
              mimetype="application/json"
          )

      if event['type'] == 'checkout.session.completed':
          session = event['data']['object']
          user_id = session['metadata']['user_id']
          amount = session['amount_total'] / 100  # Convert from cents

          # Calculate credits based on amount
          credits = calculate_credits(amount)

          credit_service = CreditService()
          await credit_service.add_credits(
              user_id=user_id,
              amount=credits,
              description=f"Credit purchase - ${amount}",
              reference=session['payment_intent']
          )

      return func.HttpResponse(
          json.dumps({"received": True}),
          status_code=200,
          mimetype="application/json"
      )

  except Exception as error:
      logging.error(f'Error in StripeWebhook: {str(error)}')
      return func.HttpResponse(
          json.dumps({"error": str(error)}),
          status_code=500,
          mimetype="application/json"
      )

def calculate_credits(amount):
  # Define credit packages
  packages = {
      1.99: 10,   # Basic package
      3.99: 25,   # Popular package
      7.99: 60    # Premium package
  }
  return packages.get(amount, 0)