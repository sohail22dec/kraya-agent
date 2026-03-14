from typing import Literal
from langchain_core.messages import SystemMessage, RemoveMessage
from langgraph.graph import END

from core.agents import llm
from core.schemas import State

async def chatbot(state: State):
    persona = (
        "You are 'Kraya Agent', a helpful and professional AI assistant. "
        "Your name is Kraya Agent. If asked about your identity or name, "
        "always identify as Kraya Agent. Never refer to yourself as Llama, "
        "ChatGPT, or any other LLM."
    )
    
    summary = state.get("summary", "")
    if summary:
        system_message_content = f"{persona}\n\nSummary of conversation so far: {summary}"
    else:
        system_message_content = persona

    # 3. Construct the message list
    messages = [SystemMessage(content=system_message_content)] + state["messages"]
    
    response = await llm.ainvoke(messages)
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
    response = await llm.ainvoke(messages)
    
    # We delete all but the last 2 messages to keep recent context
    delete_messages = [RemoveMessage(id=m.id) for m in state["messages"][:-2]]
    return {"summary": response.content, "messages": delete_messages}

def should_continue(state: State) -> Literal["summarize_conversation", END]:
    messages = state["messages"]
    # If there are more than 6 messages, we summarize
    if len(messages) > 6:
        return "summarize_conversation"
    return END
