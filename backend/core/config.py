import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from core.mcp_client import get_mcp_tools
from core.graph import create_graph
from core.agents import llm
from core.rag import search_knowledge_base


@asynccontextmanager
async def lifespan(app: FastAPI):
    DB_URI = os.getenv("DATABASE_URL")
    if not DB_URI:
        raise ValueError("DATABASE_URL is not set in the environment.")

    connection_kwargs = {
        "autocommit": True,
        "prepare_threshold": 0,
    }

    async with AsyncConnectionPool(
        conninfo=DB_URI,
        max_size=20,
        kwargs=connection_kwargs,
        check=AsyncConnectionPool.check_connection,
    ) as pool:
        app.state.pool = pool
        mcp_tools = await get_mcp_tools()
        all_tools = mcp_tools + [search_knowledge_base]
        
        llm_with_tools = llm.bind_tools(all_tools)
        
        graph_builder = create_graph(all_tools)
        
        memory = AsyncPostgresSaver(pool)
        await memory.setup()
        
        app.state.graph_app = graph_builder.compile(checkpointer=memory)
        app.state.llm_with_tools = llm_with_tools
        yield
