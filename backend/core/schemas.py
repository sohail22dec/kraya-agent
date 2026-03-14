from typing import Annotated
from typing_extensions import TypedDict
from pydantic import BaseModel
from langgraph.graph.message import add_messages

class ChatRequest(BaseModel):
    message: str
    thread_id: str

class ChatResponse(BaseModel):
    response: str
    thread_id: str

class State(TypedDict):
    messages: Annotated[list, add_messages]
    summary: str
