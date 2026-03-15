export type Role = "user" | "assistant";

export interface Message {
    id: string;
    role: Role;
    content: string;
    createdAt: Date;
    isStreaming?: boolean;
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}

export interface StreamChunk {
    type: "token" | "done" | "error";
    content?: string;
    error?: string;
}