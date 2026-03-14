from dotenv import load_dotenv

load_dotenv()
from langgraph.graph import StateGraph, START, END

from core.schemas import State
from core.nodes import chatbot, summarize_conversation, should_continue

graph_builder = StateGraph(State)
graph_builder.add_node("chatbot", chatbot)
graph_builder.add_node("summarize_conversation", summarize_conversation)

graph_builder.add_edge(START, "chatbot")
graph_builder.add_conditional_edges(
    "chatbot",
    should_continue,
)
graph_builder.add_edge("summarize_conversation", END)
