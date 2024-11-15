# auth/middleware.py
import jwt
from jwt import PyJWKClient
from functools import wraps
import json
import logging
from typing import Optional, Dict, Any, Callable, Union, Awaitable, TypeVar, cast
import azure.functions as func
from azure.functions import HttpRequest, HttpResponse
import re

# Define a TypeVar for the function
T = TypeVar('T', bound=Callable[..., Awaitable[HttpResponse]])

class AuthMiddleware:
    def __init__(self, tenant: str, client_id: str, user_flow: str):
        """Initialize Auth Middleware"""
        self.tenant = self._normalize_tenant(tenant)
        self.client_id = client_id
        self.user_flow = user_flow
        self.issuer = f"https://{self.tenant}.b2clogin.com/{self.tenant}.onmicrosoft.com/{self.user_flow}/v2.0/"
        self.jwks_url = f"https://{self.tenant}.b2clogin.com/{self.tenant}.onmicrosoft.com/{self.user_flow}/discovery/v2.0/keys"
        self.audience = self.client_id
        self._jwks_client = None
        logging.info(f"Auth middleware initialized with tenant: {self.tenant}")

    def _normalize_tenant(self, tenant: str) -> str:
        """
        Normalize tenant identifier to the correct format
        """
        # Remove .onmicrosoft.com if present
        tenant = tenant.replace('.onmicrosoft.com', '')
        
        # If it's a GUID, keep it as is
        guid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
        if guid_pattern.match(tenant):
            return tenant
        
        # If it's a tenant name, use it directly
        return tenant

    @property
    def jwks_client(self) -> PyJWKClient:
        if self._jwks_client is None:
            self._jwks_client = PyJWKClient(self.jwks_url)
        return self._jwks_client

    def get_token_from_header(self, req: func.HttpRequest) -> Optional[str]:
        """Extract Bearer token from Authorization header"""
        auth_header = req.headers.get('Authorization', '')
        if not auth_header or not auth_header.startswith('Bearer '):
            logging.warning("No valid Authorization header found")
            return None
        return auth_header[7:]  # Remove 'Bearer ' prefix

    def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate JWT token and return claims if valid"""
        try:
            logging.info("Starting token validation")
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.audience,
                issuer=self.issuer
            )
            logging.info("Token validation successful")
            return claims
        except jwt.ExpiredSignatureError:
            logging.error("Token has expired")
            raise
        except jwt.InvalidAudienceError:
            logging.error(f"Invalid audience. Expected: {self.audience}")
            raise
        except jwt.InvalidIssuerError:
            logging.error(f"Invalid issuer. Expected: {self.issuer}")
            raise
        except Exception as e:
            logging.error(f"Token validation error: {str(e)}")
            raise

def require_auth(func: T) -> T:
    """Decorator to require authentication for Function App endpoints"""
    @wraps(func)
    async def wrapper(req: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        try:
            # Import auth_middleware at the decorator level
            from .. import auth_middleware
            
            if auth_middleware is None:
                return HttpResponse(
                    json.dumps({"error": "Authentication middleware not initialized"}),
                    status_code=500,
                    mimetype="application/json"
                )

            token = auth_middleware.get_token_from_header(req)
            if not token:
                return HttpResponse(
                    json.dumps({"error": "No authorization token provided"}),
                    status_code=401,
                    mimetype="application/json"
                )

            claims = auth_middleware.validate_token(token)
            setattr(req, 'auth_claims', claims)
            
            return await func(req, *args, **kwargs)

        except Exception as e:
            logging.error(f"Authentication error: {str(e)}")
            return HttpResponse(
                json.dumps({"error": f"Authentication error: {str(e)}"}),
                status_code=401,
                mimetype="application/json"
            )
    
    return cast(T, wrapper)