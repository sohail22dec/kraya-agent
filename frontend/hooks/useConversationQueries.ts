import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import {
    fetchConversations,
    fetchConversation,
    createConversation,
    deleteConversationApi,
    queryKeys,
} from "@/lib/api";
import { Conversation } from "@/types/chat";

// ─── Fetch all conversations (sidebar list) ───────────────────────────────────

export function useConversations() {
    return useQuery({
        queryKey: queryKeys.conversations,
        queryFn: fetchConversations,
        // Fallback to empty array so the sidebar renders immediately
        placeholderData: [],
    });
}

// ─── Fetch a single conversation ──────────────────────────────────────────────

export function useConversation(id: string | null) {
    return useQuery({
        queryKey: queryKeys.conversation(id!),
        queryFn: () => fetchConversation(id!),
        enabled: !!id,
    });
}

// ─── Create conversation ──────────────────────────────────────────────────────

export function useCreateConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (title: string) => createConversation(title),
        onSuccess: (newConv) => {
            // Optimistically prepend to the list
            queryClient.setQueryData<Conversation[]>(
                queryKeys.conversations,
                (old = []) => [newConv, ...old]
            );
        },
    });
}

// ─── Delete conversation ──────────────────────────────────────────────────────

export function useDeleteConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteConversationApi(id),
        onMutate: async (id) => {
            // Cancel in-flight refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.conversations });

            // Snapshot for rollback
            const prev = queryClient.getQueryData<Conversation[]>(
                queryKeys.conversations
            );

            // Optimistic remove
            queryClient.setQueryData<Conversation[]>(
                queryKeys.conversations,
                (old = []) => old.filter((c) => c.id !== id)
            );

            return { prev };
        },
        onError: (_err, _id, ctx) => {
            // Roll back on error
            if (ctx?.prev) {
                queryClient.setQueryData(queryKeys.conversations, ctx.prev);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
        },
    });
}

// ─── Utility: update a conversation in cache (used after streaming) ───────────

export function useUpdateConversationCache() {
    const queryClient = useQueryClient();

    return (id: string, updater: (old: Conversation) => Conversation) => {
        // Update in list
        queryClient.setQueryData<Conversation[]>(
            queryKeys.conversations,
            (old = []) =>
                old.map((c) => (c.id === id ? updater(c) : c))
        );
        // Update single-conversation cache if present
        queryClient.setQueryData<Conversation>(
            queryKeys.conversation(id),
            (old) => (old ? updater(old) : old)
        );
    };
}