from typing import Literal
from langchain_core.messages import SystemMessage, RemoveMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END

from core.agents import summarizer_llm
from core.schemas import State
from core.router import classify_query
from langgraph.prebuilt import tools_condition


# ─── Router Node ──────────────────────────────────────────────────────────────


async def router_node(state: State) -> dict:
    """
    Classifies the latest user message as 'conversational' or 'research'.
    The result is stored in state['route'] and used by the conditional edge.
    """
    messages = state["messages"]
    # Find the last human message
    last_user_content = ""
    for msg in reversed(messages):
        if msg.type == "human":
            last_user_content = msg.content
            break

    route = await classify_query(last_user_content)
    print(f"[Router] Route decision: '{route}' for: '{last_user_content[:60]}'")
    return {"route": route}


def route_condition(state: State) -> Literal["chatbot", "research_node"]:
    """Reads the route set by router_node and directs the graph accordingly."""
    route = state.get("route", "conversational")
    if route == "research":
        return "research_node"
    return "chatbot"


# ─── Research Node ────────────────────────────────────────────────────────────
# NOTE: This node is intentionally a pass-through in the graph.
# The actual research pipeline is run DIRECTLY in routes.py via streaming,
# because LangGraph nodes cannot yield SSE events mid-execution.
# This node stores metadata so the graph state remains consistent.


async def research_node(state: State) -> dict:
    """
    Placeholder that marks the state as having been handled by the research pipeline.
    The real work (run_research_pipeline) is called in routes.py before graph invocation.
    """
    # The research pipeline result is injected as an AIMessage by routes.py
    # This node simply records that research was performed.
    return {"route": "research"}


# ─── Chatbot Node ─────────────────────────────────────────────────────────────


async def chatbot(state: State, config: RunnableConfig):
    # Get the bound LLM from the config provided during invocation
    llm_with_tools = config.get("configurable", {}).get("llm_with_tools")

    persona = (
        "You are 'Kraya Agent', a helpful and professional AI assistant. "
        "Your name is Kraya Agent. If asked about your identity or name, "
        "always identify as Kraya Agent. Never refer to yourself as Llama, "
        "ChatGPT, or any other LLM."
    )

    summary = state.get("summary", "")
    if summary:
        system_message_content = (
            f"{persona}\n\nSummary of conversation so far: {summary}"
        )
    else:
        system_message_content = persona

    messages = [SystemMessage(content=system_message_content)] + state["messages"]
    response = await llm_with_tools.ainvoke(messages)
    return {"messages": [response]}


# ─── Summarization Nodes ──────────────────────────────────────────────────────


async def summarize_conversation(state: State):
    summary = state.get("summary", "")
    if summary:
        summary_message = (
            f"This is summary of the conversation to date: {summary}\n\n"
            "Extend the summary by adding the new messages below:"
        )
    else:
        summary_message = "Create a summary of the conversation below:"

    messages = state["messages"] + [SystemMessage(content=summary_message)]
    response = await summarizer_llm.ainvoke(messages)

    # Keep only the last 2 messages after summarizing
    delete_messages = [RemoveMessage(id=m.id) for m in state["messages"][:-2]]
    return {"summary": response.content, "messages": delete_messages}


async def prune_messages(state: State):
    """Remove tool messages and tool-calling AI messages to save tokens."""
    messages = state["messages"]
    pruned = []
    for msg in messages:
        if msg.type == "tool":
            pruned.append(RemoveMessage(id=msg.id))
        elif msg.type == "ai" and getattr(msg, "tool_calls", None):
            pruned.append(RemoveMessage(id=msg.id))

    return {"messages": pruned}


# ─── Conditions ───────────────────────────────────────────────────────────────


def summarization_condition(
    state: State,
) -> Literal["summarize_conversation", "router_node"]:
    messages = state["messages"]
    if len(messages) > 4:
        return "summarize_conversation"
    return "router_node"


def agent_condition(state: State) -> Literal["tools", "prune_messages"]:
    if tools_condition(state) == "tools":
        return "tools"
    return "prune_messages"


def after_prune_condition(state: State):
    return END
