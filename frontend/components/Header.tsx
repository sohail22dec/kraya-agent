"use client";

import { Menu, Bot, MoreHorizontal, Trash2, LogIn, LogOut, User, FileText } from "lucide-react";
import { Conversation } from "@/types/chat";
import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { authClient } from "@/lib/auth-client";
import { AuthModal } from "./AuthModal";

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const { user, isAnonymous, signOut } = useAuth();

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-md z-10 shrink-0">
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
            <div className="w-6 h-6 rounded-md bg-white/[0.08] border border-violet-500/20 flex items-center justify-center shadow-sm shadow-violet-500/5">
              <Bot size={12} className="text-violet-400/80" />
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

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Conversation menu */}
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

          {/* Auth button */}
          {isAnonymous ? (
            <button
              id="header-sign-in-btn"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white bg-white/[0.05] hover:bg-white/[0.08] border border-violet-500/20 hover:border-violet-500/40 transition-all shadow-sm shadow-violet-500/5"
            >
              <LogIn size={13} className="text-violet-400/80" />
              Sign in
            </button>
          ) : (
            <div className="relative">
              <button
                id="header-user-menu-btn"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-white/70 hover:text-white bg-white/[0.05] hover:bg-white/[0.08] border border-violet-500/20 hover:border-violet-500/40 transition-all shadow-sm shadow-violet-500/5"
              >
                <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                  <User size={11} className="text-violet-400/80" />
                </div>
                <span className="max-w-[80px] truncate">{user?.name || user?.email}</span>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl bg-[#1e1e1e] border border-white/[0.08] shadow-xl py-1 overflow-hidden">
                    <div className="px-3 py-2 border-b border-white/[0.06]">
                      <p className="text-xs font-medium text-white/80 truncate">{user?.name}</p>
                      <p className="text-[11px] text-white/35 truncate mt-0.5">{user?.email}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await authClient.signIn.social({
                          provider: "google",
                          callbackURL: "/",
                        });
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
                    >
                      <FileText size={13} />
                      Connect Google Docs
                    </button>
                    <button
                      id="header-sign-out-btn"
                      onClick={() => {
                        signOut();
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
                    >
                      <LogOut size={13} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </>
  );
}
