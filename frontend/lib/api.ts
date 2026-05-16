import { Message, Conversation } from "@/types/chat";

const API_BASE = "http://localhost:8000";

// ─── REST API functions (used by TanStack Query) ──────────────────────────────

export async function fetchConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/conversations`, { credentials: "include" });
    if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
    return res.json();
}

export async function fetchConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, { credentials: "include" });
    if (!res.ok) throw new Error(`Failed to fetch conversation: ${res.status}`);
    return res.json();
}

export async function createConversation(title: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
    return res.json();
}

export async function deleteConversationApi(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
}

// ─── Query Keys (single source of truth) ──────────────────────────────────────

export const queryKeys = {
    conversations: ["conversations"] as const,
    conversation: (id: string) => ["conversations", id] as const,
};

// ─── SSE Streaming callbacks ───────────────────────────────────────────────────
// The new SSE protocol sends typed events:
//   { type: "content",  content: "<text chunk>" }  — final answer / report chunks
//   { type: "status",   content: "<label>" }        — research progress indicator
//   { type: "queries",  content: ["q1", "q2"] }     — planned sub-queries
//   { type: "route",    content: "research" | "conversational" }
//   { type: "error",    content: "<message>" }

export interface StreamCallbacks {
    onContent: (chunk: string) => void;
    onStatus?: (label: string) => void;
    onQueries?: (queries: string[]) => void;
    onRoute?: (route: string) => void;
}

export async function* streamMessage(
    messages: Message[],
    callbacks: StreamCallbacks,
    threadId?: string,
    signal?: AbortSignal
): AsyncGenerator<string> {
    const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
        },
        credentials: "include",
        body: JSON.stringify({
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            thread_id: threadId,
        }),
        signal,
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/event-stream")) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") return;

                let event;
                try {
                    event = JSON.parse(data);
                } catch (parseErr) {
                    // Not JSON — skip silently
                    continue;
                }

                const { type, content } = event;

                if (type === "content" && typeof content === "string") {
                    callbacks.onContent(content);
                    yield content;
                } else if (type === "status" && callbacks.onStatus) {
                    callbacks.onStatus(content as string);
                } else if (type === "queries" && callbacks.onQueries) {
                    callbacks.onQueries(content as string[]);
                } else if (type === "route" && callbacks.onRoute) {
                    callbacks.onRoute(content as string);
                } else if (type === "error") {
                    throw new Error(content as string);
                }
                // Legacy fallback: old { content: "..." } format without type
                else if (!type && typeof event.content === "string") {
                    callbacks.onContent(event.content);
                    yield event.content;
                }
            }
        }
    } else {
        // Fallback: plain JSON response
        const data = await response.json();
        const content =
            data.output ?? data.content ?? data.response ?? JSON.stringify(data);
        callbacks.onContent(content);
        yield content;
    }
}