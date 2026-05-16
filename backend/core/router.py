"""
Router Agent — classifies every user message as:
  - "conversational": greetings, simple facts, small talk, definitions
  - "research": current events, news, market analysis, technical deep-dives,
                multi-part questions, or anything needing live web search
  - "export": requests to save, store, or export a report to Google Docs
Uses the fast llama-3.1-8b-instant model to keep latency low.
"""

from core.agents import router_llm

ROUTER_SYSTEM_PROMPT = """You are a query classifier for an AI assistant.

Your ONLY job is to decide which agent should handle the user message.
Reply with EXACTLY one word — no punctuation, no explanation:

- "export" — for:
  * ANY request to save, store, export, or write a report to Google Docs
  * Examples: "save this to google docs", "store the report", "export to docs"
  * This MUST take priority over all other classifications

- "conversational" — for:
  * Greetings and small talk (hi, hello, how are you, what's your name)
  * Simple factual questions with well-known stable answers (capital cities, basic math, definitions)
  * Requests about the assistant itself (what can you do, who made you)
  * Follow-up chitchat in an ongoing conversation

- "research" — for:
  * Current events, news, market movements, stock prices
  * Technical analysis, trends, comparisons across multiple sources
  * Questions about recent developments (anything that could have changed in the last year)
  * Multi-part questions that benefit from gathering information from several angles
  * Any question where the best answer requires searching the web

When in doubt, choose "research" — it's better to over-research than under-research.
"""


async def classify_query(user_message: str) -> str:
    """
    Returns 'conversational' or 'research' based on the user message.
    Falls back to 'research' on any error.
    """
    try:
        from langchain_core.messages import SystemMessage, HumanMessage
        response = await router_llm.ainvoke([
            SystemMessage(content=ROUTER_SYSTEM_PROMPT),
            HumanMessage(content=user_message),
        ])
        route = response.content.strip().lower().strip('"').strip("'")
        if route not in ("conversational", "research", "export"):
            return "research"
        return route
    except Exception as e:
        print(f"[Router] Classification error: {e}. Defaulting to 'research'.")
        return "research"
