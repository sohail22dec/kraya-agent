from langgraph.graph import StateGraph, START, END
from core.schemas import State
from core.nodes import (
    chatbot,
    summarize_conversation,
    agent_condition,
    prune_messages,
    summarization_condition,
    router_node,
    route_condition,
    research_node,
)
from langgraph.prebuilt import ToolNode
from dotenv import load_dotenv

load_dotenv()


def create_graph(tools: list):
    graph_builder = StateGraph(State)

    # Define tool node
    tool_node = ToolNode(tools)

    # ── Nodes ────────────────────────────────────────────────────────────────
    graph_builder.add_node("router_node", router_node)
    graph_builder.add_node("chatbot", chatbot)
    graph_builder.add_node("research_node", research_node)
    graph_builder.add_node("summarize_conversation", summarize_conversation)
    graph_builder.add_node("tools", tool_node)
    graph_builder.add_node("prune_messages", prune_messages)

    # ── Edges ─────────────────────────────────────────────────────────────────
    # START: check if we need to summarize first, otherwise go to router
    graph_builder.add_conditional_edges(
        START,
        summarization_condition,
    )

    # After summarization, go to router (not directly to chatbot)
    graph_builder.add_edge("summarize_conversation", "router_node")

    # Router decides: conversational → chatbot, research → research_node
    graph_builder.add_conditional_edges(
        "router_node",
        route_condition,
    )

    # Conversational path: chatbot → tools (if needed) → prune → END
    graph_builder.add_conditional_edges(
        "chatbot",
        agent_condition,
    )
    graph_builder.add_edge("tools", "chatbot")

    # Research path: research_node result was injected by routes.py → prune → END
    graph_builder.add_edge("research_node", "prune_messages")

    # Final cleanup
    graph_builder.add_edge("prune_messages", END)

    return graph_builder
