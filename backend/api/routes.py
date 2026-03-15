from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from core.schemas import ChatRequest
from langchain_core.messages import HumanMessage, AIMessage
from api.conversations import get_conversations, get_conversation as get_conv_metadata, delete_conversation, create_or_update_conversation, get_message_history
from datetime import datetime, timezone
import json
import asyncio

router = APIRouter()

@router.get("/")
async def read_root():
    return {"message": "Welcome to the Kraya Agent API"}

@router.post("/chat")
async def chat_endpoint(request: Request, chat_request: ChatRequest):
    async def event_generator():
        try:
            pool = request.app.state.pool
            graph_app = request.app.state.graph_app
            thread_id = chat_request.thread_id or "default"
            
            config = {
                "configurable": {
                    "thread_id": thread_id,
                    "llm_with_tools": request.app.state.llm_with_tools
                }
            }
            
            # Convert schemas to LangChain messages
            messages = []
            for msg in chat_request.messages:
                if msg.role == "user":
                    messages.append(HumanMessage(content=msg.content))
                else:
                    messages.append(AIMessage(content=msg.content))

            # Update/Create conversation metadata
            if chat_request.messages:
                title = chat_request.messages[0].content[:40] + "..."
                await create_or_update_conversation(pool, thread_id, title)

            # Invoke graph and stream simulated tokens (as per previous logic)
            result = await graph_app.ainvoke({"messages": messages}, config=config)
            ai_message = result["messages"][-1]
            content = ai_message.content
            
            # Update metadata again in case we want to update "updated_at"
            await create_or_update_conversation(pool, thread_id, title)

            # Stream tokens
            for i in range(0, len(content), 4):
                chunk = content[i:i+4]
                yield f"data: {json.dumps({'content': chunk})}\n\n"
                await asyncio.sleep(0.01)
                
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/conversations")
async def get_all_conversations(request: Request):
    return await get_conversations(request.app.state.pool)

@router.get("/conversations/{id}")
async def get_single_conversation(request: Request, id: str):
    pool = request.app.state.pool
    graph_app = request.app.state.graph_app
    
    # Fetch metadata and history
    metadata = await get_conv_metadata(pool, id)
    messages = await get_message_history(graph_app, id)
    
    if not metadata:
        # If no metadata exists but checkpoints might, return a placeholder
        return {
            "id": id,
            "title": "New Conversation",
            "messages": [m.dict() for m in messages],
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
    
    # Return full Conversation object
    return {
        **metadata,
        "messages": [m.dict() for m in messages]
    }

@router.delete("/conversations/{id}")
async def delete_conv(request: Request, id: str):
    await delete_conversation(request.app.state.pool, id)
    return {"status": "ok"}
