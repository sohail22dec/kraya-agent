"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";

type User = {
  id: string;
  name: string;
  email: string;
  isAnonymous?: boolean | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAnonymous: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const queryClient = useQueryClient();

  const refreshSession = async () => {
    const { data } = await authClient.getSession();
    if (data?.user) {
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        isAnonymous: (data.user as User & { isAnonymous?: boolean | null }).isAnonymous,
      });
    } else {
      setUser(null);
    }
    // Invalidate conversation cache so the UI fetches the new user's chats
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          setUser({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            isAnonymous: (data.user as User & { isAnonymous?: boolean | null }).isAnonymous,
          });
        } else {
          // No session — create an anonymous one automatically
          const { data: anonData } = await authClient.signIn.anonymous();
          if (anonData?.user) {
            setUser({
              id: anonData.user.id,
              name: anonData.user.name,
              email: anonData.user.email,
              isAnonymous: true,
            });
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const signOut = async () => {
    await authClient.signOut();
    // Re-create anonymous session after sign out
    const { data } = await authClient.signIn.anonymous();
    if (data?.user) {
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        isAnonymous: true,
      });
    }
    // Clear old conversations from the UI
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const isAnonymous = !!user?.isAnonymous;

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAnonymous, showAuthModal, setShowAuthModal, signOut, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
