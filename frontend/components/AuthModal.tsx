"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Loader2, Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { refreshSession } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (err) {
          setError(err.message ?? "Sign up failed");
          return;
        }
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
        });
        if (err) {
          setError(err.message ?? "Login failed");
          return;
        }
      }
      await refreshSession();
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-[400px] mx-4 bg-[#111111]/70 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white rounded-md hover:bg-white/[0.05] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white">
              {mode === "login" ? "Sign in" : "Sign up"}
            </h2>
            <p className="text-sm text-white/50 mt-1.5">
              {mode === "login"
                ? "Welcome back to Kraya."
                : "Create an account to continue."}
            </p>
          </div>

          {/* Social Auth */}
          <div className="mb-6">
            <button
              onClick={async () => {
                await authClient.signIn.social({
                  provider: "google",
                  callbackURL: "/",
                });
              }}
              className="w-full flex items-center justify-center gap-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white text-sm font-medium rounded-lg py-2.5 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-grow border-t border-white/[0.05]"></div>
            <span className="flex-shrink-0 mx-4 text-xs text-white/40 uppercase tracking-widest">
              Or
            </span>
            <div className="flex-grow border-t border-white/[0.05]"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-transparent border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/[0.3] transition-colors"
                />
              </div>
            )}

            <div>
              <input
                id="auth-email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/[0.3] transition-colors"
              />
            </div>

            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-transparent border border-white/[0.1] rounded-lg pl-4 pr-10 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/[0.3] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              id="auth-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === "login" ? "Sign in" : "Continue"}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-sm text-white/50">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
                setPassword("");
              }}
              className="text-white hover:underline focus:outline-none"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
