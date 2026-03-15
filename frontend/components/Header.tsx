"use client";

import { Menu, Bot, MoreHorizontal, Trash2 } from "lucide-react";
import { Conversation } from "@/types/chat";
import { useState } from "react";

interface HeaderProps {
    onToggleSidebar: () => void;
    activeConversation: Conversation | null;
    onDelete?: () => void;
    isSidebarOpen: boolean;
}

export function Header({
    onToggleSidebar,
    activeConversation,
    onDelete,
    isSidebarOpen,
}: HeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#111111]/80 backdrop-blur-md z-10 shrink-0">
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleSidebar}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                    title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    <Menu size={16} />
                </button>

                {!isSidebarOpen && (
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Bot size={12} className="text-white" />
                        </div>
                        <span className="text-sm font-semibold text-white/80 tracking-tight">
                            Kraya
                        </span>
                    </div>
                )}
            </div>

            {/* Conversation title */}
            {activeConversation && (
                <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-white/60 max-w-[40%] truncate pointer-events-none">
                    {activeConversation.title}
                </h1>
            )}

            {/* Actions */}
            <div className="relative">
                {activeConversation && (
                    <button
                        onClick={() => setMenuOpen((o) => !o)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                )}

                {menuOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-[#1e1e1e] border border-white/[0.08] shadow-xl py-1 overflow-hidden">
                            <button
                                onClick={() => {
                                    onDelete?.();
                                    setMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:bg-white/[0.05] transition-colors"
                            >
                                <Trash2 size={13} />
                                Delete conversation
                            </button>
                        </div>
                    </>
                )}
            </div>
        </header>
    );
}