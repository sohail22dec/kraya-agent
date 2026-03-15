import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Message, Conversation } from "@/types/chat";
import { streamMessage, queryKeys } from "@/lib/api";
import {
    useConversations,
    useDeleteConversation,
    useUpdateConversationCache,
} from "./useConversationQueries";

function generateId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getTitle(content: string) {
    return content.slice(0, 42) + (content.length > 42 ? "…" : "");
}

export function useChat() {
    const queryClient = useQueryClient();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Local messages keyed by conversation ID — merges with TQ cache for streaming
    const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});

    const abortRef = useRef<AbortController | null>(null);

    // ─── TanStack Query ────────────────────────────────────────────────────────
    const { data: conversations = [], isLoading: isLoadingConversations } =
        useConversations();

    const deleteMutation = useDeleteConversation();
    const updateCache = useUpdateConversationCache();

    // ─── Derived state ─────────────────────────────────────────────────────────
    const activeConversation =
        conversations.find((c) => c.id === activeId) ?? null;

    const activeMessages: Message[] =
        localMessages[activeId ?? ""] ??
        activeConversation?.messages ??
        [];

    // ─── Actions ───────────────────────────────────────────────────────────────

    const newConversation = useCallback(() => {
        const id = generateId();
        const conv: Conversation = {
            id,
            title: "New chat",
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        queryClient.setQueryData<Conversation[]>(queryKeys.conversations, (old = []) => [
            conv,
            ...old,
        ]);
        setActiveId(id);
        setLocalMessages((prev) => ({ ...prev, [id]: [] }));
        setError(null);
    }, [queryClient]);

    const deleteConversation = useCallback(
        (id: string) => {
            deleteMutation.mutate(id);
            if (activeId === id) {
                setActiveId(null);
                setLocalMessages((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }
        },
        [activeId, deleteMutation]
    );

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim() || isStreaming) return;
            setError(null);

            let convId = activeId;
            if (!convId) {
                const id = generateId();
                const conv: Conversation = {
                    id,
                    title: getTitle(content),
                    messages: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                queryClient.setQueryData<Conversation[]>(
                    queryKeys.conversations,
                    (old = []) => [conv, ...old]
                );
                setActiveId(id);
                convId = id;
            }

            const userMsg: Message = {
                id: generateId(),
                role: "user",
                content: content.trim(),
                createdAt: new Date(),
            };

            const assistantMsg: Message = {
                id: generateId(),
                role: "assistant",
                content: "",
                createdAt: new Date(),
                isStreaming: true,
            };

            const previousMessages: Message[] =
                localMessages[convId] ??
                conversations.find((c) => c.id === convId)?.messages ??
                [];

            const optimisticMessages = [...previousMessages, userMsg, assistantMsg];

            setLocalMessages((prev) => ({ ...prev, [convId!]: optimisticMessages }));

            if (previousMessages.length === 0) {
                updateCache(convId, (c) => ({ ...c, title: getTitle(content) }));
            }

            setIsStreaming(true);
            abortRef.current = new AbortController();

            try {
                let accumulated = "";

                const gen = streamMessage(
                    [...previousMessages, userMsg],
                    (chunk) => {
                        accumulated += chunk;
                        setLocalMessages((prev) => ({
                            ...prev,
                            [convId!]: prev[convId!].map((m) =>
                                m.id === assistantMsg.id ? { ...m, content: accumulated } : m
                            ),
                        }));
                    },
                    abortRef.current.signal
                );

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for await (const _ of gen) { /* handled in onChunk */ }

                const finalMessages = optimisticMessages.map((m) =>
                    m.id === assistantMsg.id
                        ? { ...m, content: accumulated, isStreaming: false }
                        : m
                );

                setLocalMessages((prev) => ({ ...prev, [convId!]: finalMessages }));
                updateCache(convId, (c) => ({
                    ...c,
                    messages: finalMessages,
                    updatedAt: new Date(),
                }));
            } catch (err: unknown) {
                if (err instanceof Error && err.name === "AbortError") return;
                const msg = err instanceof Error ? err.message : "Something went wrong.";
                setError(msg);
                setLocalMessages((prev) => ({
                    ...prev,
                    [convId!]: prev[convId!].map((m) =>
                        m.id === assistantMsg.id
                            ? { ...m, content: `⚠️ ${msg}`, isStreaming: false }
                            : m
                    ),
                }));
            } finally {
                setIsStreaming(false);
            }
        },
        [activeId, conversations, isStreaming, localMessages, queryClient, updateCache]
    );

    const stopStreaming = useCallback(() => {
        abortRef.current?.abort();
        setIsStreaming(false);
    }, []);

    const dismissError = useCallback(() => setError(null), []);

    return {
        conversations,
        activeConversation,
        activeMessages,
        activeId,
        isStreaming,
        isLoadingConversations,
        error,
        setActiveId,
        newConversation,
        deleteConversation,
        sendMessage,
        stopStreaming,
        dismissError,
    };
}
