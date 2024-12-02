from typing import Optional, List, Dict, Any
import logging
import os
from datetime import datetime
from azure.cosmos import CosmosClient, PartitionKey
from ..models.user import User
from ..models.credit_transaction import CreditTransaction

class CosmosService:
    def __init__(self):
      connection_string = os.environ.get('COSMOS_DB_CONNECTION_STRING')
      self.client = CosmosClient.from_connection_string(connection_string)
      self.database = self.client.get_database_client('StoryFairyDB')
      self.user_container = self.database.get_container_client('Users')
      self.transaction_container = self.database.get_container_client('CreditTransactions')
      self.stories_container = self.database.get_container_client("Stories")

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
  
    async def create_story(self, story_data: Dict[str, Any]) -> str:
        """
        Create a new story document in Cosmos DB
        Returns the created story's ID
        """
        try:
            story_doc = {
                "id": story_data.get("id"),
                "userId": story_data["userId"],
                "title": story_data["title"],
                "storyText": story_data["storyText"],
                "detailedStoryText": story_data.get("detailedStoryText"),
                "storyUrl": story_data["storyUrl"],
                "detailedStoryUrl": story_data["detailedStoryUrl"],
                "images": story_data["images"],
                "coverImages": story_data["coverImages"],
                "createdAt": datetime.utcnow().isoformat(),
                "metadata": {
                    "topic": story_data.get("topic", ""),
                    "storyLength": story_data.get("storyLength", "short"),
                    "imageStyle": story_data.get("imageStyle", "whimsical"),
                    "storyModel": story_data.get("storyModel", "gemini"),
                    "imageModel": story_data.get("imageModel", "flux_schnell"),
                    "storyStyle": story_data.get("storyStyle", "adventure"),
                    "voiceName": story_data.get("voiceName", "en-US-AvaNeural"),
                    "creditsUsed": story_data.get("creditsUsed", 5)
                }
            }

            created_item = self.stories_container.create_item(body=story_doc)
            return created_item['id']
        except Exception as e:
            logging.error(f"Error creating story in Cosmos DB: {e}")
            raise

    async def get_user_stories(self, user_id: str, page_size: int = 10, continuation_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Get paginated stories for a specific user
        """
        try:
            query = """
                SELECT * FROM c 
                WHERE c.userId = @userId 
                ORDER BY c.createdAt DESC
            """

            parameters = [{"name": "@userId", "value": user_id}]

            query_response = self.stories_container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=True,
                max_item_count=page_size,
                continuation_token=continuation_token
            )

            items = list(query_response)

            return {
                "stories": items,
                "continuation_token": query_response.continuation_token
            }
        except Exception as e:
            logging.error(f"Error fetching user stories from Cosmos DB: {e}")
            raise

    async def delete_story(self, story_id: str, user_id: str) -> bool:
        """
        Delete a story document from Cosmos DB
        Returns True if successful, False otherwise
        """
        try:
            # First verify the story belongs to the user
            query = """
                SELECT * FROM c 
                WHERE c.id = @id AND c.userId = @userId
            """
            parameters = [
                {"name": "@id", "value": story_id},
                {"name": "@userId", "value": user_id}
            ]

            result = list(self.stories_container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=True
            ))

            if not result:
                return False

            # Delete the story
            self.stories_container.delete_item(
                item=story_id, 
                partition_key=user_id
            )
            return True
        except Exception as e:
            logging.error(f"Error deleting story from Cosmos DB: {e}")
            raise

    async def get_story_by_id(self, story_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific story by ID and verify it belongs to the user
        """
        try:
            query = """
                SELECT * FROM c 
                WHERE c.id = @id AND c.userId = @userId
            """
            parameters = [
                {"name": "@id", "value": story_id},
                {"name": "@userId", "value": user_id}
            ]

            result = list(self.stories_container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=True
            ))

            return result[0] if result else None
        except Exception as e:
            logging.error(f"Error fetching story from Cosmos DB: {e}")
            raise