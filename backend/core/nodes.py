from typing import Literal
from langchain_core.messages import SystemMessage, RemoveMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END

from core.agents import summarizer_llm
from core.schemas import State
from langgraph.prebuilt import tools_condition


async def chatbot(state: State, config: RunnableConfig):
    # Get the bound LLM from the config provided during invocation
    # (Tools are bound during graph setup in config.py)
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

    # 3. Construct the message list
    messages = [SystemMessage(content=system_message_content)] + state["messages"]

    response = await llm_with_tools.ainvoke(messages)
    return {"messages": [response]}


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

    # We delete all but the last 2 messages to keep recent context
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


def summarization_condition(state: State) -> Literal["summarize_conversation", "chatbot"]:
    messages = state["messages"]
    # If there are more than 4 messages, we summarize before calling the chatbot
    if len(messages) > 4:
        return "summarize_conversation"
    return "chatbot"


def agent_condition(state: State) -> Literal["tools", "prune_messages"]:
    # 1. Check if the last message has a tool call
    if tools_condition(state) == "tools":
        return "tools"

    # 2. Before ending or summarizing, prune tool tokens
    return "prune_messages"


def after_prune_condition(state: State):
    return END
