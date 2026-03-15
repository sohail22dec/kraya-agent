from datetime import datetime
from typing import List, Optional
from core.schemas import MessageSchema

class ConversationMetadata:
    def __init__(self, id: str, title: str, created_at: datetime, updated_at: datetime):
        self.id = id
        self.title = title
        self.created_at = created_at
        self.updated_at = updated_at

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat()
        }

async def get_conversations(pool) -> List[dict]:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC")
            rows = await cur.fetchall()
            return [ConversationMetadata(*row).to_dict() for row in rows]

async def create_or_update_conversation(pool, id: str, title: str):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("""
                INSERT INTO conversations (id, title, updated_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    updated_at = CURRENT_TIMESTAMP
            """, (id, title))
            await conn.commit()

async def delete_conversation(pool, id: str):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("DELETE FROM conversations WHERE id = %s", (id, ))
            # Optionally delete langgraph checkpoints too if needed
            # For now, just the metadata
            await conn.commit()

async def get_conversation(pool, id: str) -> Optional[dict]:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id, title, created_at, updated_at FROM conversations WHERE id = %s", (id, ))
            row = await cur.fetchone()
            return ConversationMetadata(*row).to_dict() if row else None

async def get_message_history(graph_app, thread_id: str) -> List[MessageSchema]:
    config = {"configurable": {"thread_id": thread_id}}
    state = await graph_app.aget_state(config)
    messages = []
    if state.values and "messages" in state.values:
        for msg in state.values["messages"]:
            role = "user" if msg.type == "human" else "assistant"
            # Filter out tool messages for the UI if needed, or handle them
            if msg.type in ["human", "ai"]:
                msg_id = getattr(msg, "id", None) or f"{thread_id}_{len(messages)}"
                messages.append(MessageSchema(id=msg_id, role=role, content=msg.content))
    return messages
