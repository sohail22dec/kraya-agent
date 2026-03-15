from typing import Annotated, List, Optional
from typing_extensions import TypedDict
from pydantic import BaseModel
from langgraph.graph.message import add_messages

class MessageSchema(BaseModel):
    id: Optional[str] = None
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[MessageSchema]
    thread_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    thread_id: str

class State(TypedDict):
    messages: Annotated[list, add_messages]
    summary: str
