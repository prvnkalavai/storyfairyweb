# api/shared/auth/middleware.py
import jwt
from jwt import PyJWKClient
import json
import logging
from typing import Optional, Dict, Any
from azure.functions import HttpRequest

class AuthMiddleware:
  def __init__(self, tenant: str, client_id: str, user_flow: str, tenant_id: str):
      """Initialize Auth Middleware"""
      self.tenant = tenant
      self.client_id = client_id
      self.user_flow = user_flow
      self.tenant_id = tenant_id

      # JWKS URL for key fetching
      self.jwks_uri = f"https://{self.tenant}.b2clogin.com/{self.tenant}.onmicrosoft.com/{self.user_flow}/discovery/v2.0/keys"

      # Support both issuer formats
      self.issuer = f"https://{self.tenant}.b2clogin.com/{self.tenant_id}/v2.0/"

      # Initialize PyJWKClient
      self._jwks_client = PyJWKClient(self.jwks_uri)

      # Log initialization parameters
      logging.info("Auth middleware initialized with:")
      logging.info(f"jwks_uri: {self.jwks_uri}")
      logging.info(f"client_id: {self.client_id}")
      logging.info(f"tenant: {self.tenant}")
      logging.info(f"user_flow: {self.user_flow}")
      logging.info(f"tenant_id: {self.tenant_id}")
      logging.info(f"issuer_tenant_id: {self.issuer}")

  def get_token_from_header(self, req: HttpRequest) -> Optional[str]:
      """Extract Bearer token from Authorization header"""
      auth_header = req.headers.get('Authorization', '')
      logging.info(f"All headers: {dict(req.headers)}")
      logging.info(f"Auth header present: {bool(auth_header)}")

      if not auth_header or not auth_header.startswith('Bearer '):
          logging.error("Missing or invalid authorization header")
          return None

      token = auth_header[7:]  # Remove 'Bearer ' prefix
      logging.info(f"Token successfully extracted from header")
      return token

  def validate_token(self, token: str) -> Dict[str, Any]:
      """Validate JWT token and return claims if valid"""
      try:
          header = jwt.get_unverified_header(token)
          logging.info(f"Token header: {header}")

          if header.get('alg') == 'RS256':
              # Let PyJWKClient handle the key management
              signing_key = self._jwks_client.get_signing_key_from_jwt(token)

              # Try both issuer formats
              for issuer in [self.issuer]:
                  try:
                      decoded = jwt.decode(
                          token,
                          signing_key.key,
                          algorithms=['RS256'],
                          audience=self.client_id,
                          issuer=self.issuer,
                          options={
                              'verify_aud': True,
                              'verify_iss': True,
                              'verify_exp': True
                          }
                      )
                      logging.info(f"Token validated successfully with issuer: {issuer}")
                      return decoded
                  except jwt.InvalidIssuerError:
                      logging.warning(f"Invalid issuer for format: {issuer}")
                      continue
                  except Exception as e:
                      logging.error(f"Unexpected error during token validation: {str(e)}")
                      raise

              # If we get here, neither issuer format worked
              raise jwt.InvalidIssuerError("Token validation failed for both issuer formats")

          elif header.get('alg') == 'HS256':
              # For Static Web Apps internal token
              decoded = jwt.decode(token, options={"verify_signature": False})
              logging.info("Static Web Apps token decoded")
              return decoded
          else:
              raise ValueError(f'Unsupported token algorithm: {header.get("alg")}')

      except jwt.ExpiredSignatureError:
          logging.error("Token has expired")
          raise
      except jwt.InvalidAudienceError:
          logging.error(f"Invalid audience. Expected: {self.client_id}")
          raise
      except Exception as e:
          logging.error(f"Token validation failed: {str(e)}")
          raise ValueError(f"Token validation failed: {str(e)}")