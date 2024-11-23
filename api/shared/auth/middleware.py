import jwt
import json
import requests
import logging
from typing import Optional, Dict, Any
from azure.functions import HttpRequest

class AuthMiddleware:
    def __init__(self, tenant: str, client_id: str, user_flow: str, tenant_id: str):
      self.tenant = tenant
      self.client_id = client_id
      self.user_flow = user_flow
      self.tenant_id = tenant_id
      self.jwks_uri = f"https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{user_flow}/discovery/v2.0/keys"
      self._jwks = None
      logging.info("jwks_uri: " + self.jwks_uri)
      logging.info("client_id: " + self.client_id)
      logging.info("tenant: " + self.tenant)
      logging.info("user_flow: " + self.user_flow)
      logging.info("tenant_id: " + self.tenant_id)

    def get_token_from_header(self, req: HttpRequest) -> Optional[str]:
      auth_header = req.headers.get('Authorization', '')
      logging.info(f"Auth header present: {bool(auth_header)}")
      if not auth_header or not auth_header.startswith('Bearer '):
          logging.error("Missing or invalid authorization header")
          return None
      token= auth_header[7:]
      logging.info("token successfully extracted from header")
      return token  # Remove 'Bearer ' prefix

    def _get_signing_key(self, kid: str) -> Optional[str]:
        try:
            if not self._jwks:
                response = requests.get(self.jwks_uri)
                logging.info(f"JWKS URI response status: {response.status_code}")
                if response.status_code != 200:
                    logging.error(f"Failed to fetch JWKS: {response.text}")
                    raise ValueError(f"Failed to fetch JWKS: {response.status_code}")
                self._jwks = response.json()
                logging.info("JWKS fetched successfully")

            for key in self._jwks['keys']:
                if key['kid'] == kid:
                    logging.info(f"Found matching key for kid: {kid}")
                    return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))

            logging.error(f"No matching key found for kid: {kid}")
            return None
        except Exception as e:
            logging.error(f"Error getting signing key: {str(e)}")
            raise

    def validate_token(self, token: str) -> Dict[str, Any]:
      try:
          # Decode token header to get key ID (kid)
          header = jwt.get_unverified_header(token)
          if not header or 'kid' not in header:
              logging.error(f"Invalid token header: {header}")  # Add logging
              raise ValueError('Invalid token header')

          # Get the signing key
          signing_key = self._get_signing_key(header['kid'])
          logging.info(f"Signing key: {signing_key}")
          if not signing_key:
              logging.error(f"No signing key found for kid: {header['kid']}")
              raise ValueError('Signing key not found')

          # Verify token
          issuer = f"https://{self.tenant}.b2clogin.com/{self.tenant_id}/v2.0/"
          logging.info(f"Issuer: {issuer}")
          # Decode the token without verification to inspect claims
          unverified_claims = jwt.decode(token, options={"verify_signature": False})
          logging.info(f"Token issuer: {unverified_claims.get('iss')}")
          logging.info(f"Expected issuer: {issuer}")
          logging.info(f"Token audience: {unverified_claims.get('aud')}")
          logging.info(f"Expected audience: {self.client_id}")
          decoded = jwt.decode(
              token,
              signing_key,
              algorithms=['RS256'],
              audience=self.client_id,
              issuer=issuer,
              options={
                'verify_aud': True,
                'verify_iss': True,
                'verify_exp': True,
                'verify_nbf': False,  # More lenient with "not before" validation
                'verify_iat': False,  # More lenient with "issued at" validation
              }
          )
          return decoded

      except Exception as e:
          logging.error(f"Token validation failed with error: {str(e)}")
          raise ValueError(f"Token validation failed: {str(e)}")