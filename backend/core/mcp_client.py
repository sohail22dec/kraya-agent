import os
import json
from dotenv import load_dotenv
from langchain_mcp_adapters.client import MultiServerMCPClient

load_dotenv()

async def get_mcp_tools():
    # mcp.json is in the same directory as this file (backend/core/mcp.json)
    config_path = os.path.join(os.path.dirname(__file__), "mcp.json")
    with open(config_path, "r") as f:
        config = json.load(f)

    # Process config to inject API keys if needed
    tavily_key = os.getenv("TAVILY_API_KEY")
    server_name = "tavily-mcp"
    
    if tavily_key and server_name in config["mcpServers"]:
        # Ensure env dict exists
        if "env" not in config["mcpServers"][server_name]:
            config["mcpServers"][server_name]["env"] = {}
        
        # Inject key into config for the subprocess
        config["mcpServers"][server_name]["env"]["TAVILY_API_KEY"] = tavily_key

    client = MultiServerMCPClient(config["mcpServers"])
    return await client.get_tools()
