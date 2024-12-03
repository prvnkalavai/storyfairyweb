# api/shared/models/story.py
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

class Story(BaseModel):
    id: str
    user_id: str
    title: str
    story_text: str
    detailed_story_text: str
    story_url: str
    detailed_story_url: str
    images: List[Dict[str, str]]
    cover_images: Dict[str, Dict[str, str]]
    created_at: str
    metadata: Dict[str, Any]

class StoryResponse(BaseModel):
    id: str
    title: str
    created_at: str
    cover_images: Dict[str, Dict[str, str]]
    metadata: Dict[str, Any]

class StoriesListResponse(BaseModel):
    stories: List[StoryResponse]
    continuation_token: Optional[str]