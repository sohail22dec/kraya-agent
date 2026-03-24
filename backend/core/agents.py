from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(model="llama-3.3-70b-versatile")


summarizer_llm = ChatGroq(model="llama-3.1-8b-instant")
