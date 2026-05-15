"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { ErrorBanner } from "@/components/ErrorBanner";
import { AuthModal } from "@/components/AuthModal";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/providers/AuthProvider";

const GUEST_MESSAGE_LIMIT = 5;

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const { isAnonymous, isLoading: authLoading } = useAuth();

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

  const handleSend = (message: string) => {
    if (isAnonymous && guestMessageCount >= GUEST_MESSAGE_LIMIT) {
      setShowGuestModal(true);
      return;
    }
    if (isAnonymous) {
      setGuestMessageCount((c) => c + 1);
    }
    sendMessage(message);
  };

  // Show an upgrade nudge banner when guest is approaching the limit
  const isNearLimit = isAnonymous && guestMessageCount >= GUEST_MESSAGE_LIMIT - 1;

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
            onSuggestion={handleSend}
          />

          {/* Guest limit nudge banner */}
          {isNearLimit && (
            <div className="mx-4 mb-2 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm">
              <p className="text-white/60">
                <span className="text-violet-400 font-medium">
                  {GUEST_MESSAGE_LIMIT - guestMessageCount} message{GUEST_MESSAGE_LIMIT - guestMessageCount !== 1 ? "s" : ""} left.
                </span>{" "}
                Sign in to save your conversations and continue for free.
              </p>
              <button
                id="nudge-sign-in-btn"
                onClick={() => setShowGuestModal(true)}
                className="shrink-0 px-3 py-1 rounded-lg text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors"
              >
                Sign in
              </button>
            </div>
          )}

          {error && (
            <ErrorBanner error={error} onDismiss={dismissError} />
          )}

          <ChatInput
            onSend={handleSend}
            onStop={stopStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </main>

      {/* Guest limit auth modal */}
      <AuthModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onSuccess={() => {
          setShowGuestModal(false);
          setGuestMessageCount(0);
        }}
      />
    </div>
  );
}