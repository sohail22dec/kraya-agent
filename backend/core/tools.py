import os
import psycopg
from typing import Annotated
from langchain_core.tools import tool
from langchain_core.runnables.config import RunnableConfig
from langgraph.prebuilt import InjectedState
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

async def get_google_token(user_id: str) -> str | None:
    db_uri = os.getenv("DATABASE_URL")
    if not db_uri:
        return None
    # Use psycopg 3 async connection to quickly fetch the token
    async with await psycopg.AsyncConnection.connect(db_uri) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT "accessToken" FROM account WHERE "userId" = %s AND "providerId" = %s',
                (user_id, 'google')
            )
            row = await cur.fetchone()
            return row[0] if row else None

@tool
async def save_to_google_docs(
    state: Annotated[dict, InjectedState],
    config: RunnableConfig,
    action: str = "save"
) -> str:
    """
    Saves the most recently generated research report to the user's Google Docs.
    Use this tool ONLY when the user explicitly asks to save the report to Google Docs.
    """
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return "Error: Could not identify the current user. Cannot save to Google Docs."

    latest_report = state.get("latest_report")
    if not latest_report:
        return "Error: There is no recent research report available to save. Please run a research query first."

    token = await get_google_token(user_id)
    if not token:
        return "It looks like your Google account isn't connected! Please click the 'Connect Google Docs' button in your user menu first."

    try:
        # Build credentials from the access token
        creds = Credentials(token=token)
        # We need to run the synchronous googleapiclient in a thread if it blocks, 
        # but for simplicity we will just call it (it's mostly network I/O, shouldn't block the loop too badly for a quick call)
        docs_service = build('docs', 'v1', credentials=creds)

        # 1. Create a new document
        # We try to extract a title from the markdown report (first line if it starts with #)
        title = "Kraya AI Research Report"
        first_line = latest_report.strip().split('\n')[0]
        if first_line.startswith('#'):
            title = first_line.replace('#', '').strip()

        document = docs_service.documents().create(body={'title': title}).execute()
        document_id = document.get('documentId')

        # 2. Insert the text
        requests = [
            {
                'insertText': {
                    'location': {
                        'index': 1,
                    },
                    'text': latest_report
                }
            }
        ]
        
        docs_service.documents().batchUpdate(
            documentId=document_id,
            body={'requests': requests}
        ).execute()

        url = f"https://docs.google.com/document/d/{document_id}/edit"
        return f"Successfully saved the research report to your Google Docs! You can access it here: {url}"

    except Exception as e:
        print(f"[Google Docs Tool Error] {e}")
        return f"An error occurred while saving to Google Docs. Your connection might have expired, please try reconnecting your Google account."
