import { Message, Conversation } from "@/types/chat";
import { authClient } from "@/lib/auth-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Helper: get auth headers ─────────────────────────────────────────────────
// Instead of relying on cross-domain cookies (which browsers block),
// we get the session token from Better Auth and pass it as a Bearer token.
async function getAuthHeaders(): Promise<HeadersInit> {
    const session = await authClient.getSession();
    const token = session?.data?.session?.token;
    if (token) {
        return { Authorization: `Bearer ${token}` };
    }
    return {};
}

// ─── REST API functions (used by TanStack Query) ──────────────────────────────

export async function fetchConversations(): Promise<Conversation[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/conversations`, {
        headers,
        credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
    return res.json();
}

export async function fetchConversation(id: string): Promise<Conversation> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
        headers,
        credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to fetch conversation: ${res.status}`);
    return res.json();
}

export async function createConversation(title: string): Promise<Conversation> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
    return res.json();
}

export async function deleteConversationApi(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
        method: "DELETE",
        headers,
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
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...authHeaders,
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