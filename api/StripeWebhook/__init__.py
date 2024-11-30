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

        logging.info(f"Received webhook with signature: {sig_header}")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            logging.info(f"Webhook event constructed successfully: {event['type']}")
        except ValueError as e:
            logging.error(f"Invalid payload: {str(e)}")
            return func.HttpResponse(status_code=400)
        except stripe.error.SignatureVerificationError as e:
            logging.error(f"Invalid signature: {str(e)}")
            return func.HttpResponse(status_code=400)

        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            logging.info(f"Processing completed checkout session: {session['id']}")

            try:
                # Get metadata from the session
                user_id = session.get('metadata', {}).get('user_id')
                email = session.get('metadata', {}).get('email')
                amount = session['amount_total'] / 100  # Convert from cents

                if not user_id:
                    logging.error("No user_id in session metadata")
                    return func.HttpResponse(status_code=400)

                logging.info(f"Processing payment for user {user_id}, amount: ${amount}")

                # Update user email if provided
                if email:
                    try:
                        cosmos_service = CosmosService()
                        user = await cosmos_service.get_user(user_id)
                        if user and not user.email:
                            user.email = email
                            await cosmos_service.update_user(user)
                            logging.info(f"Updated email for user {user_id}")
                    except Exception as e:
                        logging.error(f"Error updating user email: {str(e)}")
                        # Continue processing even if email update fails

                # Calculate and add credits
                credits = calculate_credits(amount)
                if credits > 0:
                    credit_service = CreditService()
                    new_balance = await credit_service.add_credits(
                        user_id=user_id,
                        amount=credits,
                        description=f"Credit purchase - ${amount}",
                        reference=session['payment_intent']
                    )
                    logging.info(f"Added {credits} credits to user {user_id}. New balance: {new_balance}")
                else:
                    logging.error(f"Invalid credit amount calculated for payment amount: ${amount}")

                return func.HttpResponse(status_code=200)

            except Exception as e:
                logging.error(f"Error processing payment completion: {str(e)}")
                # Return 200 to acknowledge receipt even if processing fails
                return func.HttpResponse(status_code=200)

        # Return 200 for all other event types
        return func.HttpResponse(status_code=200)

    except Exception as error:
        logging.error(f"Unhandled error in webhook: {str(error)}")
        return func.HttpResponse(status_code=500)

def calculate_credits(amount):
    # Define credit packages with exact matching
    packages = {
        1.99: 10,   # Basic package
        3.99: 25,   # Popular package
        7.99: 60    # Premium package
    }
    # Use round to handle floating point precision issues
    rounded_amount = round(amount, 2)
    return packages.get(rounded_amount, 0)