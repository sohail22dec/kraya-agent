"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Square, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  const handleSend = () => {
    if (!value.trim() || isStreaming) return;
    onSend(value);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div className="px-4 md:px-8 py-4">
      <div className="max-w-3xl mx-auto">
        <div
          className={cn(
            "relative flex items-end gap-2 rounded-2xl border bg-[#1a1a1a] transition-all duration-200",
            isStreaming
              ? "border-violet-500/30 shadow-lg shadow-violet-900/20"
              : "border-white/[0.08] hover:border-white/[0.12] focus-within:border-violet-500/40 focus-within:shadow-lg focus-within:shadow-violet-900/20",
          )}
        >
          {/* Left actions */}
          <div className="flex items-center gap-1 pl-3 pb-3">
            <button
              className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              title="Attach file (coming soon)"
            >
              <Paperclip size={15} />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Kraya..."
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent py-3.5 text-[15px] text-white/85 placeholder:text-white/25 focus:outline-none leading-relaxed disabled:opacity-50 max-h-[200px] overflow-y-auto scrollbar-thin"
          />

          {/* Right actions */}
          <div className="flex items-center gap-1 pr-3 pb-3">
            {isStreaming ? (
              <button
                onClick={onStop}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 hover:text-white transition-all"
                title="Stop generating"
              >
                <Square size={13} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 cursor-pointer",
                  canSend
                    ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40"
                    : "bg-white/[0.05] text-white/20 cursor-not-allowed",
                )}
                title="Send (Enter)"
              >
                <Send size={15} />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-white/20 mt-2">
          Press{" "}
          <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-white/30 text-[10px]">
            Enter
          </kbd>{" "}
          to send ·{" "}
          <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-white/30 text-[10px]">
            Shift+Enter
          </kbd>{" "}
          for new line
        </p>
      </div>
    </div>
  );
}
