import os
import json
from dotenv import load_dotenv
from langchain_mcp_adapters.client import MultiServerMCPClient

load_dotenv()

async def get_mcp_tools():
    config_path = os.path.join(os.path.dirname(__file__), "mcp.json")
    with open(config_path, "r") as f:
        config = json.load(f)

    tavily_key = os.getenv("TAVILY_API_KEY")
    server_name = "tavily-mcp"
    
    if tavily_key and server_name in config["mcpServers"]:
        if "env" not in config["mcpServers"][server_name]:
            config["mcpServers"][server_name]["env"] = {}
        
        config["mcpServers"][server_name]["env"]["TAVILY_API_KEY"] = tavily_key

    client = MultiServerMCPClient(config["mcpServers"])
    return await client.get_tools()
