from typing import Literal
from langchain_core.messages import SystemMessage, RemoveMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END

from core.agents import summarizer_llm
from core.schemas import State
from core.router import classify_query
from langgraph.prebuilt import tools_condition


# ─── Router Node ──────────────────────────────────────────────────────────────


async def orchestrator(state: State) -> dict:
    """
    Classifies the latest user message and determines the next node to route to.
    """
    messages = state["messages"]
    # Find the last human message
    last_user_content = ""
    for msg in reversed(messages):
        if msg.type == "human":
            last_user_content = msg.content
            break

    route = await classify_query(last_user_content)
    
    if route == "research":
        next_node = "research_node"
    elif route == "export":
        next_node = "export_agent"
    else:
        next_node = "chatbot"
        
    return {"route": route, "next_node": next_node}


def route_from_orchestrator(state: State) -> str:
    """Reads the 'next_node' key set by the orchestrator and returns it."""
    next_node = state.get("next_node")
    return next_node or END


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
        "ChatGPT, or any other LLM. "
        "IMPORTANT: When using tools, you MUST use the native tool calling schema. "
        "NEVER output XML tags like `<function=...>` or inline JSON in your text response."
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


# ─── Export Agent ───────────────────────────────────────────────────────────────────────────


async def export_agent(state: State, config: RunnableConfig):
    """
    A dedicated, powerful agent exclusively for saving research reports to Google Docs.
    Uses the full llm to reduce hallucinations, with a strict system prompt that
    forbids inventing success messages or document links.
    """
    llm_with_tools = config.get("configurable", {}).get("llm_with_tools")

    export_persona = (
        "You are Kraya's Export Agent. Your only job is to save research reports to Google Docs "
        "by calling the 'save_to_google_docs' tool.\n\n"
        "CRITICAL RULES — you MUST follow these without exception:\n"
        "1. Always call the 'save_to_google_docs' tool. Never skip it.\n"
        "2. After the tool runs, read its output carefully.\n"
        "3. If the tool output contains a URL (https://docs.google.com/...), "
        "report that exact URL to the user. Do NOT invent or modify the URL.\n"
        "4. If the tool output contains the word 'Error', you MUST copy that error "
        "message verbatim to the user. Do NOT invent a success response.\n"
        "5. Never hallucinate. Never say the report was saved if the tool did not confirm it."
    )

    summary = state.get("summary", "")
    if summary:
        system_content = f"{export_persona}\n\nConversation summary: {summary}"
    else:
        system_content = export_persona

    messages = [SystemMessage(content=system_content)] + state["messages"]
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
) -> Literal["summarize_conversation", "orchestrator"]:
    messages = state["messages"]
    if len(messages) > 4:
        return "summarize_conversation"
    return "orchestrator"


def agent_condition(state: State) -> Literal["tools", "prune_messages"]:
    if tools_condition(state) == "tools":
        return "tools"
    return "prune_messages"


def export_agent_condition(state: State) -> Literal["tools", "prune_messages"]:
    """Same as agent_condition but for the export_agent node."""
    if tools_condition(state) == "tools":
        return "tools"
    return "prune_messages"


def after_tools_condition(state: State) -> Literal["chatbot", "export_agent"]:
    """After a tool executes, route back to the agent that called it based on state['route']."""
    route = state.get("route", "conversational")
    if route == "export":
        return "export_agent"
    return "chatbot"
