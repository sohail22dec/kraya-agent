from dotenv import load_dotenv

load_dotenv()
from langgraph.graph import StateGraph, START, END

from core.schemas import State
from core.nodes import chatbot, summarize_conversation, agent_condition
from core.agents import llm
from langgraph.prebuilt import ToolNode

def create_graph(tools: list):
    graph_builder = StateGraph(State)
    
    # Define tool node
    tool_node = ToolNode(tools)
    
    graph_builder.add_node("chatbot", chatbot)
    graph_builder.add_node("summarize_conversation", summarize_conversation)
    graph_builder.add_node("tools", tool_node)
    
    graph_builder.add_edge(START, "chatbot")
    graph_builder.add_conditional_edges(
        "chatbot",
        agent_condition,
    )
    graph_builder.add_edge("tools", "chatbot")
    graph_builder.add_edge("summarize_conversation", END)
    
    return graph_builder
