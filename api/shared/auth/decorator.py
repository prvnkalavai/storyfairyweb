# api/shared/auth/decorator.py
import json
import logging
import os
from typing import Callable, TypeVar, cast
from azure.functions import HttpRequest, HttpResponse
from functools import wraps
from .middleware import AuthMiddleware

T = TypeVar('T', bound=Callable[..., HttpResponse])

def require_auth(func: T) -> T:
  """Decorator to require authentication for Function App endpoints"""
  @wraps(func)
  async def wrapper(req: HttpRequest, *args, **kwargs) -> HttpResponse:
      try:
          # Initialize AuthMiddleware here instead of importing
          auth_middleware = AuthMiddleware(
              tenant=os.environ.get('REACT_APP_B2C_TENANT',''),
              client_id=os.environ.get('REACT_APP_B2C_CLIENT_ID',''),
              user_flow=os.environ.get('REACT_APP_B2C_USER_FLOW',''),
              tenant_id=os.environ.get('REACT_APP_B2C_TENANT_ID','')
          )
          #logging.info(f"Logging the token from the request in decorator before extracting it in middleware: {req.headers.get('Authorization')}")
      
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