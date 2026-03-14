import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from core.graph import graph_builder

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
    ) as pool:
        memory = AsyncPostgresSaver(pool)
        await memory.setup()
        app.state.graph_app = graph_builder.compile(checkpointer=memory)
        yield
