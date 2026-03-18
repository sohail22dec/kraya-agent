from langgraph.graph import StateGraph, START, END
from core.schemas import State
from core.nodes import chatbot, summarize_conversation, agent_condition, prune_messages, summarization_condition
from langgraph.prebuilt import ToolNode
from dotenv import load_dotenv

load_dotenv()


def create_graph(tools: list):
    graph_builder = StateGraph(State)

    # Define tool node
    tool_node = ToolNode(tools)

    graph_builder.add_node("chatbot", chatbot)
    graph_builder.add_node("summarize_conversation", summarize_conversation)
    graph_builder.add_node("tools", tool_node)
    graph_builder.add_node("prune_messages", prune_messages)

    # CHECK FOR SUMMARIZATION AT START
    graph_builder.add_conditional_edges(
        START,
        summarization_condition,
    )
    
    # If summarized, go to chatbot. If not, START already points to chatbot via condition.
    graph_builder.add_edge("summarize_conversation", "chatbot")

    graph_builder.add_conditional_edges(
        "chatbot",
        agent_condition,
    )
    graph_builder.add_edge("tools", "chatbot")
    
    # After pruning, we are done (summarization is checked at START of next turn)
    graph_builder.add_edge("prune_messages", END)

    return graph_builder
