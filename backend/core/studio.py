from core.graph import create_graph

# We pass an empty list for tools for visualization purposes in Studio
builder = create_graph(tools=[])

# Compile without a checkpointer for LangGraph CLI/Studio
graph = builder.compile()
