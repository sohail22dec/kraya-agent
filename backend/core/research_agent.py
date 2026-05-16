"""
Research Agent — a 5-step deep research pipeline.

Steps (sequential):
  1. plan_queries    — LLM generates 2-4 targeted sub-queries from the topic
  2. search_web      — Tavily runs each query, results are deduplicated
  3. extract_info    — small LLM extracts key facts from each source
  4. analyze_sources — small LLM synthesizes insights across all sources
  5. generate_report — large LLM writes the final structured markdown report

Each step yields an SSE status event BEFORE running so the frontend can
show real-time progress. Content events are yielded character-by-character
during the final report generation.

SSE event shapes:
  { "type": "status",  "content": "🔍 Searching web..." }
  { "type": "content", "content": "<markdown chunk>" }
"""

import json
import re
from typing import AsyncGenerator
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_tavily import TavilySearch
from core.agents import research_utility_llm, research_report_llm

# ---------------------------------------------------------------------------
# Step 1 — Plan sub-queries
# ---------------------------------------------------------------------------

PLAN_QUERIES_PROMPT = """You are a research query planner.

Given the user's topic, generate 2-4 targeted search queries that together will give
comprehensive coverage. Each query should focus on a DIFFERENT angle of the topic.

Return ONLY a JSON array of strings, nothing else. Example:
["NVIDIA stock performance 2025", "AI chip demand market analysis", "inflation impact on tech stocks"]

User topic: {topic}
"""

async def plan_queries(topic: str) -> list[str]:
    response = await research_utility_llm.ainvoke([
        HumanMessage(content=PLAN_QUERIES_PROMPT.format(topic=topic))
    ])
    raw = response.content.strip()
    # Extract JSON array from response
    match = re.search(r'\[.*?\]', raw, re.DOTALL)
    if match:
        try:
            queries = json.loads(match.group())
            if isinstance(queries, list) and queries:
                return [str(q) for q in queries[:4]]
        except json.JSONDecodeError:
            pass
    # Fallback: use the original topic as a single query
    return [topic]


# ---------------------------------------------------------------------------
# Step 2 — Search web & deduplicate sources
# ---------------------------------------------------------------------------

async def search_web(queries: list[str]) -> tuple[list[dict], list[dict]]:
    """
    Runs Tavily for each query sequentially.
    Returns (raw_results, deduplicated_sources).
    Tavily returns: { 'query': str, 'results': [ { url, title, content, score } ] }
    """
    tavily = TavilySearch(max_results=3)
    raw_results: list[dict] = []
    seen_urls: set[str] = set()
    deduped_sources: list[dict] = []

    for query in queries:
        try:
            response = await tavily.ainvoke(query)

            # Tavily returns a dict: { 'results': [...], ... }
            if isinstance(response, dict):
                items = response.get("results", [])
            elif isinstance(response, list):
                items = response
            else:
                # Unexpected format — skip
                print(f"[Research] Unexpected Tavily response type: {type(response)}")
                continue

            for item in items:
                url = item.get("url", "")
                title = item.get("title", url or query)
                content = item.get("content", "") or item.get("raw_content", "")
                if not content:
                    continue
                raw_results.append({
                    "query": query,
                    "url": url,
                    "title": title,
                    "content": content,
                })
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    deduped_sources.append({"url": url, "title": title})

        except Exception as e:
            print(f"[Research] Tavily error for query '{query}': {e}")

    return raw_results, deduped_sources


# ---------------------------------------------------------------------------
# Step 3 — Extract key facts per source
# ---------------------------------------------------------------------------

EXTRACT_PROMPT = """You are a research assistant. Extract the most important facts, data points,
and insights from the following source content. Be concise — bullet points preferred.
Focus on facts relevant to: {topic}

Source: {title}
Content: {content}

Key facts:"""

async def extract_information(raw_results: list[dict], topic: str) -> list[str]:
    extracted: list[str] = []
    for item in raw_results:
        if not item.get("content"):
            continue
        try:
            response = await research_utility_llm.ainvoke([
                HumanMessage(content=EXTRACT_PROMPT.format(
                    topic=topic,
                    title=item.get("title", "Unknown"),
                    content=item["content"][:3000],  # cap to avoid token bloat
                ))
            ])
            extracted.append(f"[From: {item.get('title', 'Unknown')}]\n{response.content.strip()}")
        except Exception as e:
            print(f"[Research] Extraction error: {e}")
    return extracted


# ---------------------------------------------------------------------------
# Step 4 — Analyze & synthesize across sources
# ---------------------------------------------------------------------------

ANALYZE_PROMPT = """You are a senior research analyst. Below are extracted facts from multiple sources.

Synthesize them into a coherent analysis covering:
- The main narrative or trend
- Key data points and their significance
- Any contradictions or different perspectives
- What this means overall

Topic: {topic}

Extracted facts from sources:
{facts}

Synthesized analysis:"""

async def analyze_sources(facts: list[str], topic: str) -> str:
    if not facts:
        return "No sufficient information found across sources."
    combined_facts = "\n\n".join(facts)
    response = await research_utility_llm.ainvoke([
        HumanMessage(content=ANALYZE_PROMPT.format(
            topic=topic,
            facts=combined_facts[:6000],  # cap to avoid token overflow
        ))
    ])
    return response.content.strip()


# ---------------------------------------------------------------------------
# Step 5 — Generate structured markdown report
# ---------------------------------------------------------------------------

REPORT_PROMPT_WITH_SOURCES = """You are an expert research writer. Write a comprehensive, well-structured
research report based on the analysis below.

STRICT FORMAT REQUIREMENTS — follow this exact structure:
# [Create a compelling, specific title based on the topic]

## Summary
[2-3 sentence executive summary of the main finding]

## Key Insights
[5-8 bullet points of the most important facts and data points]
- ...

## [Add 1-2 relevant topic-specific sections with appropriate headings]
[Detailed narrative paragraph(s) for each section]

## Sources
{sources}

---

Topic: {topic}

Analysis to base report on:
{analysis}

Write the full markdown report now:"""

REPORT_PROMPT_NO_SOURCES = """You are an expert research writer. Write a comprehensive, well-structured
research report based on the analysis below.

STRICT FORMAT REQUIREMENTS — follow this exact structure:
# [Create a compelling, specific title based on the topic]

## Summary
[2-3 sentence executive summary of the main finding]

## Key Insights
[5-8 bullet points of the most important facts and data points]
- ...

## [Add 1-2 relevant topic-specific sections with appropriate headings]
[Detailed narrative paragraph(s) for each section]

Do NOT include a Sources section.

---

Topic: {topic}

Analysis to base report on:
{analysis}

Write the full markdown report now:"""

async def generate_report(topic: str, analysis: str, sources: list[dict]) -> str:
    has_sources = bool(sources)
    if has_sources:
        sources_md = "\n".join(
            f"- [{s.get('title', s['url'])}]({s['url']})" if s.get("url")
            else f"- {s.get('title', 'Unknown source')}"
            for s in sources
        )
        prompt = REPORT_PROMPT_WITH_SOURCES.format(
            topic=topic,
            analysis=analysis[:5000],
            sources=sources_md,
        )
    else:
        prompt = REPORT_PROMPT_NO_SOURCES.format(
            topic=topic,
            analysis=analysis[:5000],
        )

    response = await research_report_llm.ainvoke([
        SystemMessage(content="You write clear, professional research reports in markdown format. Never add commentary outside the report itself."),
        HumanMessage(content=prompt),
    ])
    return response.content.strip()


# ---------------------------------------------------------------------------
# Main pipeline — async generator yielding SSE-ready dicts
# ---------------------------------------------------------------------------

async def run_research_pipeline(user_message: str) -> AsyncGenerator[dict, None]:
    """
    Yields dicts ready to be JSON-serialised into SSE events:
      { "type": "status",  "content": "..." }   — progress indicator
      { "type": "content", "content": "..." }   — final report chunks
      { "type": "queries", "content": [...] }   — planned sub-queries (optional UI use)
    """
    topic = user_message.strip()

    # ── Step 1: Plan queries ──────────────────────────────────────────────────
    yield {"type": "status", "content": "🧭 Understanding topic & planning research..."}
    queries = await plan_queries(topic)
    yield {"type": "queries", "content": queries}

    # ── Step 2: Search web ────────────────────────────────────────────────────
    for i, q in enumerate(queries, 1):
        yield {"type": "status", "content": f"🔍 Searching: \"{q}\""}

    raw_results, sources = await search_web(queries)
    yield {"type": "status", "content": f"📄 Reading {len(raw_results)} sources..."}

    # ── Step 3: Extract information ───────────────────────────────────────────
    yield {"type": "status", "content": "📝 Extracting key information..."}
    facts = await extract_information(raw_results, topic)

    # ── Step 4: Analyze ───────────────────────────────────────────────────────
    yield {"type": "status", "content": "🧠 Analyzing & synthesizing sources..."}
    analysis = await analyze_sources(facts, topic)

    # ── Step 5: Generate report ───────────────────────────────────────────────
    yield {"type": "status", "content": "✍️ Generating research report..."}
    report = await generate_report(topic, analysis, sources)

    # Stream final report in chunks for a typewriter effect
    chunk_size = 8
    for i in range(0, len(report), chunk_size):
        yield {"type": "content", "content": report[i:i + chunk_size]}
