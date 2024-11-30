# api/StripeWebhook/__init__.py
import logging
import json
import os
import stripe
import azure.functions as func
from ..shared.services.credit_service import CreditService
from ..shared.services.cosmos_service import CosmosService


stripe.api_key = os.environ.get('REACT_APP_STRIPE_SECRET_KEY')
webhook_secret = os.environ.get('REACT_APP_STRIPE_WEBHOOK_SECRET')

async def main(req: func.HttpRequest) -> func.HttpResponse:
  try:
      event = None
      payload = req.get_body().decode()
      sig_header = req.headers.get('stripe-signature')

      try:
          event = stripe.Webhook.construct_event(
              payload, sig_header, webhook_secret
          )
      except ValueError as e:
          logging.error(f'Invalid Payload: {str(e)}')
          return func.HttpResponse(
              json.dumps({"error": "Invalid payload"}),
              status_code=400
          )
      except stripe.error.SignatureVerificationError as e:
          logging.error(f'Invalid Signature: {str(e)}')
          return func.HttpResponse(
              json.dumps({"error": "Invalid signature"}),
              status_code=400
          )

      if event['type'] == 'checkout.session.completed':
          session = event['data']['object']
          user_id = session['metadata']['user_id']
          email = session['metadata']['email']
          amount = session['amount_total'] / 100  # Convert from cents
          try:  
            if email:
                cosmos_service = CosmosService()
                user = await cosmos_service.get_user(user_id)
                if user and not user.email:
                    user.email = email
                    await cosmos_service.update_user(user)

            # Calculate credits based on amount
            credits = calculate_credits(amount)
            credit_service = CreditService()
            await credit_service.add_credits(
                user_id=user_id,
                amount=credits,
                description=f"Credit purchase - ${amount}",
                reference=session['payment_intent']
            )
            logging.info(f"Successfully processed payment for user {user_id}")
          except Exception as e:
            logging.error(f"Error processing payment completion: {str(e)}")
            return func.HttpResponse(status_code=200)
      
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