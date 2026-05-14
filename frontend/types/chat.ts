export type Role = "user" | "assistant";

export interface Message {
    id: string;
    role: Role;
    content: string;
    createdAt: Date;
    isStreaming?: boolean;
    // Research pipeline fields
    isResearch?: boolean;
    statusSteps?: string[];       // progress labels shown during research
    plannedQueries?: string[];    // sub-queries the planner generated
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}

export interface StreamChunk {
    type: "content" | "status" | "queries" | "route" | "error" | "done";
    content?: string | string[];
    error?: string;
}