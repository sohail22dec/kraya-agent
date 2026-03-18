from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os

load_dotenv()

# Perplexity for main reasoning/searching
llm = ChatOpenAI(
    model="sonar-reasoning-pro",
    openai_api_key=os.getenv("PERPLEXITY_API_KEY"),
    openai_api_base="https://api.perplexity.ai",
)

# Groq remains for fast, low-cost utility tasks like summarization
summarizer_llm = ChatGroq(model="llama-3.1-8b-instant")
