"use client";

import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown, Share2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  message: Message;
}

function ActionButton({ icon: Icon, onClick, title, active = false }: { icon: any, onClick?: () => void, title: string, active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-md transition-all",
        active ? "text-white/90 bg-white/[0.08]" : "text-white/30 hover:text-white/70 hover:bg-white/[0.06]"
      )}
      title={title}
    >
      <Icon size={16} />
    </button>
  );
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
      className="p-1.5 rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
      title="Copy"
    >
      {copied ? (
        <Check size={16} className="text-green-400" />
      ) : (
        <Copy size={16} />
      )}
    </button>
  );
}

// Robust markdown renderer using react-markdown and remark-gfm
function RenderContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="leading-7 text-[16px] text-[#ececec] mb-4 last:mb-0 whitespace-pre-wrap">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "";
            const code = String(children).replace(/\n$/, "");

            if (!inline && lang) {
              return (
                <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d0d0d] my-4">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                    <span className="text-[11px] text-white/40 font-mono">
                      {lang}
                    </span>
                    <CopyButton text={code} />
                  </div>
                  <pre className="p-4 overflow-x-auto text-[13.5px] text-emerald-300/90 font-mono leading-relaxed">
                    <code>{children}</code>
                  </pre>
                </div>
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded bg-white/[0.08] text-violet-200 text-[13px] font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.01]">
              <table className="w-full border-collapse text-[14px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/[0.04] border-b border-white/[0.08]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-5 py-3 text-left font-semibold text-white/90 border-r border-white/[0.06] last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-5 py-3 border-t border-white/[0.06] border-r border-white/[0.06] last:border-r-0 text-white/70">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
              {children}
            </tr>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-2 mb-4 text-[#ececec]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-2 mb-4 text-[#ececec]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-[16px] leading-7">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse"
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
    <div className="w-full border-b border-transparent py-4 md:py-8">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <div className={cn(
          "flex gap-4 md:gap-6",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          {/* Avatar */}
          <div
            className={cn(
              "shrink-0 w-8 md:w-9 h-8 md:h-9 rounded-full flex items-center justify-center mt-1 border border-white/[0.08] shadow-sm",
              isUser
                ? "bg-indigo-600 text-white"
                : "bg-emerald-600 text-white"
            )}
          >
            {isUser ? (
              <User size={18} className="text-white" />
            ) : (
              <Bot size={18} className="text-white/80" />
            )}
          </div>

          {/* Content Wrapper */}
          <div className={cn(
            "flex flex-col gap-2 min-w-0 flex-1",
            isUser ? "items-end" : "items-start"
          )}>
            <div className={cn(
              "w-full",
              isUser ? "flex justify-end" : ""
            )}>
              {isUser ? (
                <div className="bg-[#2f2f2f] rounded-2xl px-4 py-2 text-[15.5px] text-[#ececec] max-w-[85%] inline-block">
                  {message.content}
                </div>
              ) : (
                <div className="w-full">
                  {isEmpty ? (
                    <TypingIndicator />
                  ) : (
                    <RenderContent content={message.content} />
                  )}
                </div>
              )}
            </div>

            {/* Actions Row */}
            {!isUser && message.content && !message.isStreaming && (
              <div className="flex items-center gap-1 mt-2.5 -ml-1 text-white/30">
                <CopyButton text={message.content} />
                <ActionButton icon={ThumbsUp} title="Good response" />
                <ActionButton icon={ThumbsDown} title="Bad response" />
                <ActionButton icon={RotateCcw} title="Regenerate" />
                <ActionButton icon={Share2} title="Share" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
