from datetime import datetime
import uuid
import logging
from typing import List, Optional
from .cosmos_service import CosmosService
from ..models.user import User
from ..models.credit_transaction import CreditTransaction

class CreditService:
    def __init__(self):
        self.cosmos_service = CosmosService()

    async def get_user_credits(self, user_id: str) -> int:
        logging.info(f"Getting the details of user with User ID: {user_id}")
        user = await self.cosmos_service.get_user(user_id)
        if not user:
            # Create new user with initial credits
            logging.info(f"User doesn't exist. Creating new user in the DB with User ID: {user_id}")
            new_user = User(
                id=user_id,
                user_id=user_id,
                email='',  # Will be updated later
                credits=15,  # Initial free credits
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat()
            )
            await self.cosmos_service.create_user(new_user)
            return new_user.credits
        logging.info(f"User Credits: {user.credits}")
        return user.credits

    async def deduct_credits(self, user_id: str, amount: int, description: str) -> int:
        user = await self.cosmos_service.get_user(user_id)
        if not user:
            raise ValueError('User not found')
        if user.credits < amount:
            raise ValueError('Insufficient credits')

        new_balance = user.credits - amount
        await self.cosmos_service.update_user_credits(user_id, new_balance)

        transaction = CreditTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=-amount,
            type='DEDUCTION',
            description=description,
            created_at=datetime.utcnow().isoformat()
        )
        await self.cosmos_service.create_transaction(transaction)

        return new_balance

    async def add_credits(self, user_id: str, amount: int, description: str, reference: Optional[str] = None) -> int:
        user = await self.cosmos_service.get_user(user_id)
        if not user:
            raise ValueError('User not found')

        new_balance = user.credits + amount
        await self.cosmos_service.update_user_credits(user_id, new_balance)

        transaction = CreditTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            type='PURCHASE',
            description=description,
            reference=reference,
            created_at=datetime.utcnow().isoformat()
        )
        await self.cosmos_service.create_transaction(transaction)

        return new_balance
    
    async def get_user_transactions(self, user_id: str) -> List[CreditTransaction]:
        """Get user's transaction history"""
        return await self.cosmos_service.get_user_transactions(user_id)