from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

# Main LLM for the conversational chatbot
llm = ChatGroq(model="meta-llama/llama-4-scout-17b-16e-instruct")

# Fast small model for summarization and token-cheap utility tasks
summarizer_llm = ChatGroq(model="llama-3.1-8b-instant")

# Fast small model for the router (classification only — needs minimal tokens)
router_llm = ChatGroq(model="llama-3.1-8b-instant", max_tokens=10)

# Small model for research utility steps: query planning, extraction, analysis
research_utility_llm = ChatGroq(model="llama-3.1-8b-instant")

# Large model for the final research report (quality matters here)
research_report_llm = ChatGroq(model="meta-llama/llama-4-scout-17b-16e-instruct")
