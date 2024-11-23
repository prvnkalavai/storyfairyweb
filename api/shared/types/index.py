from pydantic import BaseModel
from typing import Optional, Literal

class CosmosResource(BaseModel):
  id: str
  _rid: str
  _self: str
  _etag: str
  _attachments: str
  _ts: int

class User(CosmosResource):
  userId: str
  email: str
  credits: int
  createdAt: str
  updatedAt: str

class CreditTransaction(CosmosResource):
  userId: str
  amount: int
  type: Literal['PURCHASE', 'DEDUCTION', 'REFUND']
  description: str
  createdAt: str
  reference: Optional[str] = None

class AddCreditsRequest(BaseModel):
  amount: int
  description: Optional[str] = None
  reference: Optional[str] = None

class DeductCreditsRequest(BaseModel):
  amount: int
  description: Optional[str] = None