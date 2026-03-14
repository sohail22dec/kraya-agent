from fastapi import APIRouter, HTTPException, Request
from core.schemas import ChatRequest, ChatResponse
from langchain_core.messages import HumanMessage

router = APIRouter()

@router.get("/")
async def read_root():
    return {"message": "Welcome to the Kraya Agent API"}

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: Request, chat_request: ChatRequest):
    try:
        config = {
            "configurable": {
                "thread_id": chat_request.thread_id,
                "llm_with_tools": request.app.state.llm_with_tools
            }
        }
        user_message = {"messages": [HumanMessage(content=chat_request.message)]}
        
        graph_app = request.app.state.graph_app
        result = await graph_app.ainvoke(user_message, config=config)
        ai_message = result["messages"][-1]
        
        return ChatResponse(
            response=ai_message.content,
            thread_id=chat_request.thread_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
