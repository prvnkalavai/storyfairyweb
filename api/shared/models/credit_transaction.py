from typing import Optional, Literal
from pydantic import BaseModel

class CreditTransaction(BaseModel):
  id: str
  user_id: str
  amount: int
  type: Literal['PURCHASE', 'DEDUCTION', 'REFUND']
  description: str
  created_at: str
  reference: Optional[str] = None

class CreditTransactionDTO(BaseModel):
  user_id: str
  amount: int
  type: Literal['PURCHASE', 'DEDUCTION', 'REFUND']
  description: str
  reference: Optional[str] = None