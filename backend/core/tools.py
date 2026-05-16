import os
import psycopg
from typing import Annotated
from langchain_core.tools import tool
from langchain_core.runnables.config import RunnableConfig
from langgraph.prebuilt import InjectedState
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


async def get_google_credentials(user_id: str) -> Credentials | None:
    """
    Fetches both the access token and refresh token from the database
    and returns a refreshable Google Credentials object.
    Returns None if no Google account is linked.
    """
    db_uri = os.getenv("DATABASE_URL")
    if not db_uri:
        return None

    async with await psycopg.AsyncConnection.connect(db_uri) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT "accessToken", "refreshToken" FROM account WHERE "userId" = %s AND "providerId" = %s',
                (user_id, 'google')
            )
            row = await cur.fetchone()
            if not row:
                return None
            access_token, refresh_token = row[0], row[1]

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=[
            "https://www.googleapis.com/auth/documents",
            "https://www.googleapis.com/auth/drive.file",
        ],
    )
    return creds


@tool
async def save_to_google_docs(
    state: Annotated[dict, InjectedState],
    config: RunnableConfig,
) -> str:
    """
    Saves the most recently generated research report to the user's Google Docs.
    Use this tool ONLY when the user explicitly asks to save the report to Google Docs.
    CRITICAL: If this tool returns any error message, you MUST repeat that exact error
    message to the user verbatim. Do NOT invent a success response or a document link
    if the tool did not return one.
    """
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return "Error: Could not identify the current user. Cannot save to Google Docs."

    latest_report = state.get("latest_report")
    if not latest_report:
        return "Error: There is no recent research report available to save. Please run a research query first."

    creds = await get_google_credentials(user_id)
    if not creds:
        return (
            "Error: Your Google account is not connected. Please click the "
            "'Connect Google Docs' button in your user menu (top right) to link your account."
        )

    try:
        # Refresh the access token if it has expired (uses the refresh_token automatically)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())

        docs_service = build('docs', 'v1', credentials=creds)

        # Extract a title from the first markdown heading, if present
        title = "Kraya AI Research Report"
        first_line = latest_report.strip().split('\n')[0]
        if first_line.startswith('#'):
            title = first_line.lstrip('#').strip()

        # 1. Create the document
        document = docs_service.documents().create(body={'title': title}).execute()
        document_id = document.get('documentId')

        # 2. Insert the report text
        requests = [
            {
                'insertText': {
                    'location': {'index': 1},
                    'text': latest_report
                }
            }
        ]
        docs_service.documents().batchUpdate(
            documentId=document_id,
            body={'requests': requests}
        ).execute()

        url = f"https://docs.google.com/document/d/{document_id}/edit"
        return f"Successfully saved the research report to Google Docs! Here is the direct link: {url}"

    except Exception as e:
        print(f"[Google Docs Tool Error] {e}")
        return (
            f"Error: Failed to save to Google Docs. The connection may have expired. "
            f"Please click 'Connect Google Docs' in your user menu to reconnect your account. "
            f"Technical detail: {str(e)}"
        )
