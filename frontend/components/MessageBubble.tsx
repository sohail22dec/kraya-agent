"use client";

import {
  Bot,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Search,
  Globe,
  Brain,
  FileText,
  PenLine,
  Compass,
} from "lucide-react";
import { useState } from "react";
import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  message: Message;
}

// ─── Action / Copy buttons ────────────────────────────────────────────────────

function ActionButton({
  icon: Icon,
  onClick,
  title,
  active = false,
}: {
  icon: any;
  onClick?: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-md transition-all",
        active
          ? "text-white/90 bg-white/[0.08]"
          : "text-white/30 hover:text-white/70 hover:bg-white/[0.06]",
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

// ─── Markdown renderer ────────────────────────────────────────────────────────

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
          li: ({ children }) => (
            <li className="text-[16px] leading-7">{children}</li>
          ),
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
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mt-2 mb-4 pb-2 border-b border-white/[0.08]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white/90 mt-6 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-white/80 mt-4 mb-2">
              {children}
            </h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

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

// ─── Research thinking panel ──────────────────────────────────────────────────

const STEP_ICONS: Record<string, any> = {
  "🧭": Compass,
  "🔍": Search,
  "📄": FileText,
  "📝": PenLine,
  "🧠": Brain,
  "✍️": PenLine,
  "🌐": Globe,
};

function getStepIcon(label: string) {
  for (const [emoji, Icon] of Object.entries(STEP_ICONS)) {
    if (label.startsWith(emoji)) return Icon;
  }
  return Search;
}

function ResearchThinkingPanel({
  steps,
  queries,
  isStreaming,
  hasContent,
}: {
  steps: string[];
  queries: string[];
  isStreaming: boolean;
  hasContent: boolean;
}) {
  // Auto-collapse once the report starts arriving
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = collapsed || (!isStreaming && hasContent);

  if (!steps.length && !queries.length) return null;

  return (
    <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-indigo-400" />
          <span className="text-[12px] font-medium text-white/50 tracking-wide uppercase">
            Research Process
          </span>
          {isStreaming && !hasContent && (
            <span className="flex gap-0.5 ml-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-indigo-400/60 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </span>
          )}
        </div>
        <div className="text-white/30">
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </button>

      {/* Body */}
      {!isCollapsed && (
        <div className="px-4 pb-3 space-y-2.5 border-t border-white/[0.05]">
          {/* Planned queries */}
          {queries.length > 0 && (
            <div className="pt-3">
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2 font-medium">
                Search queries
              </p>
              <div className="flex flex-col gap-1.5">
                {queries.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-white/50"
                  >
                    <Search size={11} className="mt-0.5 shrink-0 text-white/25" />
                    <span className="italic">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress steps */}
          {steps.length > 0 && (
            <div className={queries.length > 0 ? "pt-1" : "pt-3"}>
              {queries.length > 0 && (
                <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2 font-medium">
                  Steps
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {steps.map((step, i) => {
                  const StepIcon = getStepIcon(step);
                  const isLast = i === steps.length - 1;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2.5 text-[13px] transition-opacity",
                        isLast && isStreaming && !hasContent
                          ? "text-white/70"
                          : "text-white/35",
                      )}
                    >
                      <StepIcon
                        size={13}
                        className={cn(
                          "shrink-0",
                          isLast && isStreaming && !hasContent
                            ? "text-indigo-400"
                            : "text-white/20",
                        )}
                      />
                      <span>{step}</span>
                      {isLast && isStreaming && !hasContent && (
                        <span className="flex gap-0.5 ml-auto">
                          {[0, 1, 2].map((j) => (
                            <span
                              key={j}
                              className="w-0.5 h-3 rounded-full bg-indigo-400/50 animate-pulse"
                              style={{ animationDelay: `${j * 0.15}s` }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main MessageBubble ───────────────────────────────────────────────────────

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isEmpty = !message.content && message.isStreaming;
  const hasSteps =
    (message.statusSteps?.length ?? 0) > 0 ||
    (message.plannedQueries?.length ?? 0) > 0;

  return (
    <div className="w-full border-b border-transparent py-4 md:py-8">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <div
          className={cn(
            "flex gap-4 md:gap-6",
            isUser ? "flex-row-reverse" : "flex-row",
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              "shrink-0 w-8 md:w-9 h-8 md:h-9 rounded-full flex items-center justify-center mt-1 border border-white/[0.08] shadow-sm",
              isUser ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white",
            )}
          >
            {isUser ? (
              <User size={18} className="text-white" />
            ) : (
              <Bot size={18} className="text-white/80" />
            )}
          </div>

          {/* Content wrapper */}
          <div
            className={cn(
              "flex flex-col gap-2 min-w-0 flex-1",
              isUser ? "items-end" : "items-start",
            )}
          >
            <div className={cn("w-full", isUser ? "flex justify-end" : "")}>
              {isUser ? (
                <div className="bg-[#2f2f2f] rounded-2xl px-4 py-2 text-[15.5px] text-[#ececec] max-w-[85%] inline-block">
                  {message.content}
                </div>
              ) : (
                <div className="w-full">
                  {/* Research thinking panel — shown when research is in flight or done */}
                  {!isUser && hasSteps && (
                    <ResearchThinkingPanel
                      steps={message.statusSteps ?? []}
                      queries={message.plannedQueries ?? []}
                      isStreaming={!!message.isStreaming}
                      hasContent={!!message.content}
                    />
                  )}

                  {/* Main content */}
                  {isEmpty && !hasSteps ? (
                    <TypingIndicator />
                  ) : isEmpty && hasSteps ? null : (
                    <RenderContent content={message.content} />
                  )}
                </div>
              )}
            </div>

            {/* Actions row */}
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
