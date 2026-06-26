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
    # Routing decision: "conversational" or "research"
    route: Optional[str]
    # Next node for orchestrator routing
    next_node: Optional[str]
    # Research pipeline intermediate data
    research_steps: Optional[List[str]]    # status labels emitted during research
    research_queries: Optional[List[str]]  # sub-queries planned by the research agent
    sources: Optional[List[dict]]          # deduplicated { title, url } source list
    latest_report: Optional[str]           # the most recently generated research report
