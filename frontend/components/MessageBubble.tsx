"use client";

import { useEffect, useRef } from "react";
import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
    message: Message;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100"
            title="Copy"
        >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
        </button>
    );
}

// Very lightweight markdown renderer (code blocks, bold, inline code)
function RenderContent({ content }: { content: string }) {
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className="space-y-3">
            {parts.map((part, i) => {
                if (part.startsWith("```")) {
                    const lines = part.slice(3, -3).split("\n");
                    const lang = lines[0].trim();
                    const code = lines.slice(1).join("\n");
                    return (
                        <div key={i} className="rounded-lg overflow-hidden border border-white/[0.08] bg-[#0a0a0a]">
                            {lang && (
                                <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                                    <span className="text-[11px] text-white/40 font-mono">{lang}</span>
                                    <CopyButton text={code} />
                                </div>
                            )}
                            <pre className="p-4 overflow-x-auto text-[13px] text-emerald-300/90 font-mono leading-relaxed">
                                <code>{code}</code>
                            </pre>
                        </div>
                    );
                }

                // Inline formatting
                const segments = part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
                return (
                    <p key={i} className="leading-7 text-[15px] text-white/85 whitespace-pre-wrap">
                        {segments.map((seg, j) => {
                            if (seg.startsWith("`") && seg.endsWith("`")) {
                                return (
                                    <code
                                        key={j}
                                        className="px-1.5 py-0.5 rounded bg-white/[0.08] text-violet-300 text-[13px] font-mono"
                                    >
                                        {seg.slice(1, -1)}
                                    </code>
                                );
                            }
                            if (seg.startsWith("**") && seg.endsWith("**")) {
                                return (
                                    <strong key={j} className="font-semibold text-white">
                                        {seg.slice(2, -2)}
                                    </strong>
                                );
                            }
                            return <span key={j}>{seg}</span>;
                        })}
                    </p>
                );
            })}
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 py-1 px-1">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-violet-400/70 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </div>
    );
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === "user";
    const isEmpty = !message.content && message.isStreaming;

    return (
        <div
            className={cn(
                "flex gap-3 py-5 group",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    "shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5",
                    isUser
                        ? "bg-gradient-to-br from-indigo-500 to-violet-600"
                        : "bg-white/[0.06] border border-white/[0.08]"
                )}
            >
                {isUser ? (
                    <User size={14} className="text-white" />
                ) : (
                    <Bot size={14} className="text-white/70" />
                )}
            </div>

            {/* Content */}
            <div
                className={cn(
                    "flex flex-col gap-1 max-w-[80%]",
                    isUser ? "items-end" : "items-start"
                )}
            >
                <span className="text-[11px] font-medium text-white/30 px-1">
                    {isUser ? "You" : "Kraya"}
                </span>

                <div
                    className={cn(
                        "rounded-2xl px-4 py-3",
                        isUser
                            ? "bg-violet-600/20 border border-violet-500/20 rounded-tr-sm"
                            : "bg-white/[0.04] border border-white/[0.06] rounded-tl-sm"
                    )}
                >
                    {isEmpty ? (
                        <TypingIndicator />
                    ) : isUser ? (
                        <p className="text-[15px] text-white/90 leading-7 whitespace-pre-wrap">
                            {message.content}
                        </p>
                    ) : (
                        <RenderContent content={message.content} />
                    )}
                </div>

                {/* Actions for assistant messages */}
                {!isUser && message.content && !message.isStreaming && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                        <CopyButton text={message.content} />
                    </div>
                )}
            </div>
        </div>
    );
}