import os
from langchain_core.tools import tool
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from dotenv import load_dotenv

load_dotenv()

# Initialize embeddings
# The gemini-embedding-001 model outputs 768-dimensional vectors
try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
except Exception as e:
    print(
        f"Warning: Could not initialize Google Generative AI Embeddings. Make sure GOOGLE_API_KEY is set. Error: {e}"
    )
    embeddings = None

# Initialize Qdrant client
# We'll use a local path by default unless QDRANT_URL is provided
qdrant_url = os.getenv("QDRANT_URL")
qdrant_api_key = os.getenv("QDRANT_API_KEY")

collection_name = "kraya_knowledge"
vector_store = None

try:
    if qdrant_url:
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)

        if embeddings:
            vector_store = QdrantVectorStore(
                client=client,
                collection_name=collection_name,
                embedding=embeddings,
            )
    else:
        print("Warning: QDRANT_URL is not set. Vector store will be disabled.")
except Exception as e:
    print(
        f"Warning: Could not initialize Qdrant. Vector store will be disabled. Error: {e}"
    )


@tool
def search_knowledge_base(query: str) -> str:
    """
    Search the internal knowledge base for information relevant to the user's query.
    Use this tool when the user asks questions about specific documents, company information,
    or topics that you don't confidently know the answer to.

    Args:
        query: The search query string.
    """
    if not vector_store:
        return "Error: Vector store is not properly initialized. The knowledge base is unavailable."

    try:
        docs = vector_store.similarity_search(query, k=3)
        if not docs:
            return "No relevant information found in the knowledge base for this query."

        formatted_docs = "\n\n".join(
            [
                f"Source: {doc.metadata.get('source', 'Unknown')}\nContent: {doc.page_content}"
                for doc in docs
            ]
        )
        return f"Found the following information in the knowledge base:\n\n{formatted_docs}"
    except Exception as e:
        return f"Error while searching the knowledge base: {str(e)}"
