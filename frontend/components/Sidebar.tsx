"use client";

import { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Search,
  ChevronLeft,
  Bot,
  Loader2,
} from "lucide-react";
import { Conversation } from "@/types/chat";
import { cn } from "@/lib/utils";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onToggle,
  isLoading,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayItems = filtered.filter(
    (c) => new Date(c.updatedAt).toDateString() === today.toDateString(),
  );
  const yesterdayItems = filtered.filter(
    (c) => new Date(c.updatedAt).toDateString() === yesterday.toDateString(),
  );
  const olderItems = filtered.filter(
    (c) =>
      new Date(c.updatedAt).toDateString() !== today.toDateString() &&
      new Date(c.updatedAt).toDateString() !== yesterday.toDateString(),
  );

  const groups = [
    ...(todayItems.length ? [{ label: "Today", items: todayItems }] : []),
    ...(yesterdayItems.length
      ? [{ label: "Yesterday", items: yesterdayItems }]
      : []),
    ...(olderItems.length ? [{ label: "Older", items: olderItems }] : []),
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "fixed md:relative z-30 flex flex-col h-full bg-[#171717] transition-all duration-300 ease-in-out shrink-0",
          isOpen ? "w-64" : "w-0 overflow-hidden",
        )}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-3 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Bot size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white/90 tracking-tight">
              Kraya
            </span>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
        </div>

        {/* New chat */}
        <div className="px-2 pb-1">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-all group"
          >
            <Plus
              size={15}
              className="group-hover:rotate-90 transition-transform duration-200 shrink-0"
            />
            New chat
          </button>
        </div>

        {/* Search */}
        {conversations.length > 4 && (
          <div className="px-2 pb-2">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats…"
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.07] rounded-lg text-white/70 placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 transition-all"
              />
            </div>
          </div>
        )}

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
          {isLoading ? (
            <div className="flex justify-center pt-10">
              <Loader2 size={16} className="text-white/20 animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-14 gap-2.5 text-white/20">
              <MessageSquare size={26} strokeWidth={1.5} />
              <p className="text-xs">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((conv) => (
                      <li key={conv.id}>
                        <div
                          className={cn(
                            "relative flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer group/item transition-colors",
                            activeId === conv.id
                              ? "bg-white/[0.09] text-white"
                              : "text-white/55 hover:bg-white/[0.05] hover:text-white/80",
                          )}
                          onClick={() => onSelect(conv.id)}
                          onMouseEnter={() => setHoveredId(conv.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <MessageSquare
                            size={13}
                            className="shrink-0 opacity-50"
                          />
                          <span className="text-[13px] truncate flex-1 leading-snug">
                            {conv.title}
                          </span>
                          {(hoveredId === conv.id || activeId === conv.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(conv.id);
                              }}
                              className="shrink-0 p-0.5 rounded text-white/25 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
