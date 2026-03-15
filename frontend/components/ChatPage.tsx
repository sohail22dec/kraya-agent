"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useChat } from "@/hooks/useChat";

export function ChatPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const {
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
    } = useChat();

    return (
        <div className="flex h-screen bg-[#212121] overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                conversations={conversations}
                activeId={activeId}
                onSelect={setActiveId}
                onNew={newConversation}
                onDelete={deleteConversation}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((o) => !o)}
                isLoading={isLoadingConversations}
            />

            {/* Main area */}
            <div className="flex flex-col flex-1 min-w-0 h-full">
                <Header
                    onToggleSidebar={() => setSidebarOpen((o) => !o)}
                    activeConversation={activeConversation}
                    onDelete={activeId ? () => deleteConversation(activeId) : undefined}
                    isSidebarOpen={sidebarOpen}
                />

                <MessageList
                    messages={activeMessages}
                    onSuggestion={sendMessage}
                />

                {error && <ErrorBanner error={error} onDismiss={dismissError} />}

                <ChatInput
                    onSend={sendMessage}
                    onStop={stopStreaming}
                    isStreaming={isStreaming}
                />
            </div>
        </div>
    );
}