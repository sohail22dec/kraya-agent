from langgraph.graph import StateGraph, START, END
from core.schemas import State
from core.nodes import (
    chatbot,
    export_agent,
    summarize_conversation,
    agent_condition,
    export_agent_condition,
    after_tools_condition,
    prune_messages,
    summarization_condition,
    orchestrator,
    route_from_orchestrator,
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
    graph_builder.add_node("orchestrator", orchestrator)
    graph_builder.add_node("chatbot", chatbot)
    graph_builder.add_node("export_agent", export_agent)
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

    # After summarization, go to orchestrator (not directly to chatbot)
    graph_builder.add_edge("summarize_conversation", "orchestrator")

    # Orchestrator decides which agent to route to
    graph_builder.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        {
            "chatbot": "chatbot",
            "export_agent": "export_agent",
            "research_node": "research_node",
            END: END,
        }
    )

    # Conversational path: chatbot → tools (if needed) → prune → END
    graph_builder.add_conditional_edges(
        "chatbot",
        agent_condition,
    )

    # Export path: export_agent → tools (to call save_to_google_docs) → export_agent → prune → END
    graph_builder.add_conditional_edges(
        "export_agent",
        export_agent_condition,
    )

    # After any tool execution, route back to the correct calling agent based on state["route"]
    graph_builder.add_conditional_edges(
        "tools",
        after_tools_condition,
    )

    # Research path: research_node result was injected by routes.py → prune → END
    graph_builder.add_edge("research_node", "prune_messages")

    # Final cleanup
    graph_builder.add_edge("prune_messages", END)

    return graph_builder
