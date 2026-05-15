from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
from core.schemas import ChatRequest
from core.auth import get_current_user
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
async def chat_endpoint(
    request: Request,
    chat_request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    async def event_generator():
        try:
            pool = request.app.state.pool
            graph_app = request.app.state.graph_app
            user_id = current_user["id"]
            # Prefix thread_id with user_id so every user has isolated conversation history
            raw_thread = chat_request.thread_id or "default"
            thread_id = f"{user_id}:{raw_thread}"

            config = {
                "configurable": {
                    "thread_id": thread_id,
                    "user_id": user_id,
                    "llm_with_tools": request.app.state.llm_with_tools
                }
            }

            # Only process the very last message to prevent exponential state duplication
            messages = []
            if chat_request.messages:
                last_msg = chat_request.messages[-1]
                if last_msg.role == "user":
                    messages.append(HumanMessage(content=last_msg.content))
                else:
                    messages.append(AIMessage(content=last_msg.content))

            # Update/Create conversation metadata
            title = "New conversation"
            if chat_request.messages:
                title = chat_request.messages[0].content[:40] + "..."
                await create_or_update_conversation(pool, raw_thread, title, user_id=user_id)

            # ── Route classification ──────────────────────────────────────────
            # We run the router separately BEFORE the graph so we can branch
            # the SSE stream: research queries get the full pipeline treatment,
            # conversational queries go straight to graph invocation.
            from core.router import classify_query

            user_content = ""
            if chat_request.messages:
                user_content = chat_request.messages[-1].content

            route = await classify_query(user_content)
            yield f"data: {json.dumps({'type': 'route', 'content': route})}\n\n"

            if route == "research":
                # ── Research path ─────────────────────────────────────────────
                # 1. Run the full research pipeline, streaming status + content events
                from core.research_agent import run_research_pipeline

                full_report = ""
                planned_queries: list[str] = []

                async for event in run_research_pipeline(user_content):
                    event_type = event.get("type")

                    if event_type == "status":
                        # Progress indicator — stream to frontend immediately
                        yield f"data: {json.dumps({'type': 'status', 'content': event['content']})}\n\n"
                        await asyncio.sleep(0)  # flush buffer

                    elif event_type == "queries":
                        # Sub-queries the planner generated — optional UI use
                        planned_queries = event["content"]
                        yield f"data: {json.dumps({'type': 'queries', 'content': planned_queries})}\n\n"
                        await asyncio.sleep(0)

                    elif event_type == "content":
                        # Actual report content — stream each chunk
                        chunk = event["content"]
                        full_report += chunk
                        yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
                        await asyncio.sleep(0.005)  # slight delay for typewriter feel

                # 2. Inject the finished report into the graph as an AIMessage so
                #    LangGraph checkpointer saves it and conversation history works.
                if full_report:
                    research_message = AIMessage(content=full_report)
                    await graph_app.ainvoke(
                        {
                            "messages": messages + [research_message],
                            "route": "research",
                            "latest_report": full_report
                        },
                        config=config
                    )

            else:
                # ── Conversational path ───────────────────────────────────────
                # Graph handles everything: routing, tool calls, etc.
                result = await graph_app.ainvoke({"messages": messages}, config=config)
                ai_message = result["messages"][-1]
                content = ai_message.content

                # Stream tokens
                for i in range(0, len(content), 4):
                    chunk = content[i:i + 4]
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
                    await asyncio.sleep(0.01)

            # Update conversation metadata
            await create_or_update_conversation(pool, raw_thread, title, user_id=user_id)
            yield "data: [DONE]\n\n"

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/conversations")
async def get_all_conversations(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    return await get_conversations(request.app.state.pool, user_id=current_user["id"])


@router.get("/conversations/{id}")
async def get_single_conversation(
    request: Request,
    id: str,
    current_user: dict = Depends(get_current_user),
):
    pool = request.app.state.pool
    graph_app = request.app.state.graph_app
    user_id = current_user["id"]
    scoped_thread_id = f"{user_id}:{id}"

    metadata = await get_conv_metadata(pool, id)
    messages = await get_message_history(graph_app, scoped_thread_id)

    if not metadata:
        return {
            "id": id,
            "title": "New Conversation",
            "messages": [m.dict() for m in messages],
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }

    return {
        **metadata,
        "messages": [m.dict() for m in messages]
    }


@router.delete("/conversations/{id}")
async def delete_conv(
    request: Request,
    id: str,
    current_user: dict = Depends(get_current_user),
):
    await delete_conversation(request.app.state.pool, id)
    return {"status": "ok"}
