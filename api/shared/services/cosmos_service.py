from typing import Optional, List
import logging
from azure.cosmos import CosmosClient
from ..models.user import User
from ..models.credit_transaction import CreditTransaction
import os

class CosmosService:
  def __init__(self):
      connection_string = os.environ.get('COSMOS_DB_CONNECTION_STRING')
      self.client = CosmosClient.from_connection_string(connection_string)
      self.database = self.client.get_database_client('StoryFairyDB')
      self.user_container = self.database.get_container_client('Users')
      self.transaction_container = self.database.get_container_client('CreditTransactions')

#   async def get_user(self, user_id: str) -> Optional[User]:
#       try:
#           response = self.user_container.read_item(
#               item=user_id,
#               partition_key=user_id              
#           )
#           logging.info(f"Response: {response}")
#           return User(**response)
#       except Exception as e:
#           logging.error(f"Error getting user: {str(e)}") 
#           if getattr(e, 'status_code', None) == 404:
#               return None
#           raise e
  async def get_user(self, user_id: str) -> Optional[User]:
    try:
      query = "SELECT * FROM c WHERE c.id = @userId"
      parameters = [{"name": "@userId", "value": user_id}]

      results = list(self.user_container.query_items(
          query=query,
          parameters=parameters,
          enable_cross_partition_query=True
      ))

      if not results:
          return None

      return User(**results[0])
    except Exception as e:
      logging.error(f"Error getting user: {str(e)}")
      raise e

  async def create_user(self, user: User) -> User:
      response = self.user_container.create_item(body=user.dict())
      return User(**response)
  
  async def update_user(self, user: User) -> User:
      response = self.user_container.replace_item(
          item=user.id,
          body=user.dict()
      )
      return User(**response)

  async def update_user_credits(self, user_id: str, credits: int) -> User:
      user = await self.get_user(user_id)
      if not user:
          raise ValueError("User not found")

      user.credits = credits
      response = self.user_container.replace_item(
          item=user_id,
          body=user.dict()
      )
      return User(**response)

  async def create_transaction(self, transaction: CreditTransaction) -> CreditTransaction:
      response = self.transaction_container.create_item(body=transaction.dict())
      return CreditTransaction(**response)

  async def get_user_transactions(self, user_id: str) -> List[CreditTransaction]:
      query = "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC"
      parameters = [{"name": "@userId", "value": user_id}]

      results = self.transaction_container.query_items(
          query=query,
          parameters=parameters,
          enable_cross_partition_query=True
      )

      return [CreditTransaction(**item) for item in results]