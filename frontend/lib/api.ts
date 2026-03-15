import { Message, Conversation } from "@/types/chat";

const API_BASE = "http://127.0.0.1:8000";

// ─── REST API functions (used by TanStack Query) ─────────────────────────────

export async function fetchConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/conversations`);
    if (!res.ok) throw new Error(`Failed to fetch conversations: ${res.status}`);
    return res.json();
}

export async function fetchConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
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
    });
    if (!res.ok) throw new Error(`Failed to delete conversation: ${res.status}`);
}

// ─── Query Keys (single source of truth) ─────────────────────────────────────

export const queryKeys = {
    conversations: ["conversations"] as const,
    conversation: (id: string) => ["conversations", id] as const,
};

// ─── Streaming (NOT via TanStack Query — SSE needs raw fetch) ────────────────
// LangGraph streams tokens over SSE; TanStack Query can't subscribe to these.
// We use a raw async generator here and manage state in useChat.ts.

export async function* streamMessage(
    messages: Message[],
    onChunk: (chunk: string) => void,
    threadId?: string,
    signal?: AbortSignal
): AsyncGenerator<string> {
    const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
        },
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
                if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") return;
                    try {
                        const chunk = JSON.parse(data);
                        // Handle different LangGraph token formats
                        const token =
                            chunk.content ??
                            chunk.output ??
                            chunk.text ??
                            (typeof chunk === "string" ? chunk : null);
                        if (token) {
                            onChunk(token);
                            yield token;
                        }
                    } catch {
                        if (data) {
                            onChunk(data);
                            yield data;
                        }
                    }
                }
            }
        }
    } else {
        // Fallback: plain JSON response from LangGraph invoke
        const data = await response.json();
        const content =
            data.output ?? data.content ?? data.response ?? JSON.stringify(data);
        onChunk(content);
        yield content;
    }
}