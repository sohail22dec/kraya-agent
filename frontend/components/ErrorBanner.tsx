"use client";

import { AlertCircle, X } from "lucide-react";

interface ErrorBannerProps {
    error: string;
    onDismiss: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
    return (
        <div className="mx-4 md:mx-8 mb-2">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <p className="text-sm flex-1">{error}</p>
                    <button
                        onClick={onDismiss}
                        className="shrink-0 hover:text-red-300 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}