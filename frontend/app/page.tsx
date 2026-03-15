"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useChat } from "@/hooks/useChat";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
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

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-[#111111] overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newConversation}
        onDelete={deleteConversation}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        isLoading={isLoadingConversations}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <Header
          onToggleSidebar={toggleSidebar}
          activeConversation={activeConversation}
          onDelete={() => activeId && deleteConversation(activeId)}
          isSidebarOpen={isSidebarOpen}
        />

        <div className="flex-1 flex flex-col min-h-0">
          <MessageList 
            messages={activeMessages} 
            onSuggestion={sendMessage}
          />
          
          {error && (
            <ErrorBanner error={error} onDismiss={dismissError} />
          )}

          <ChatInput
            onSend={sendMessage}
            onStop={stopStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </main>
    </div>
  );
}