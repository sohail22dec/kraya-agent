"use client";

import { useEffect, useRef } from "react";
import { Bot, Zap, Code2, FileText, Lightbulb } from "lucide-react";
import { Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";

const SUGGESTIONS = [
    { icon: Code2, label: "Help me write", sub: "a Python script for data analysis" },
    { icon: Lightbulb, label: "Explain", sub: "how LangGraph works" },
    { icon: FileText, label: "Summarize", sub: "key points from a document" },
    { icon: Zap, label: "Debug", sub: "my LangChain agent" },
];

interface MessageListProps {
    messages: Message[];
    onSuggestion?: (text: string) => void;
}

function EmptyState({ onSuggestion }: { onSuggestion?: (text: string) => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-8 py-12 px-4">
            <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-900/40">
                    <Bot size={26} className="text-white" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-white/90 tracking-tight">
                        How can I help?
                    </h2>
                    <p className="text-sm text-white/40 mt-1">
                        Powered by your LangGraph backend
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {SUGGESTIONS.map(({ icon: Icon, label, sub }) => (
                    <button
                        key={sub}
                        onClick={() => onSuggestion?.(`${label} ${sub}`)}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-violet-500/30 transition-all text-left group"
                    >
                        <Icon
                            size={16}
                            className="text-violet-400/70 mt-0.5 group-hover:text-violet-400 transition-colors shrink-0"
                        />
                        <div>
                            <p className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">
                                {label}
                            </p>
                            <p className="text-xs text-white/35 mt-0.5">{sub}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function MessageList({ messages, onSuggestion }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    if (messages.length === 0) {
        return <EmptyState onSuggestion={onSuggestion} />;
    }

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-4 md:px-8 scrollbar-thin"
        >
            <div className="max-w-3xl mx-auto">
                {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={bottomRef} className="h-4" />
            </div>
        </div>
    );
}