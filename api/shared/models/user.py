from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class User(BaseModel):
  id: str
  user_id: str
  email: str
  credits: int
  created_at: str
  updated_at: str

class UserDTO(BaseModel):
  user_id: str
  email: str
  credits: int