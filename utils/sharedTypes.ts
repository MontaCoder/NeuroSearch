
export type SearchResults = {
    title?: string;
    url: string;
    content: string;
}

// ---- Reasoning effort ------------------------------------------------------

export type ReasoningEffort = "low" | "medium" | "high";

export const REASONING_EFFORTS: ReasoningEffort[] = ["low", "medium", "high"];

export const DEFAULT_REASONING_EFFORT: ReasoningEffort = "medium";

export function normalizeReasoningEffort(value: unknown): ReasoningEffort {
    return value === "low" || value === "medium" || value === "high"
        ? value
        : DEFAULT_REASONING_EFFORT;
}

// ---- Swarm types -----------------------------------------------------------

export type SwarmAgentStatus = "waiting" | "working" | "done" | "error";

export type SwarmPhase =
    | "idle"
    | "router"
    | "drafting"
    | "refining"
    | "synthesizing"
    | "done"
    | "error";

export type SwarmAgent = {
    id: string;
    name: string;
    role: string;
    perspective: string;
    status: SwarmAgentStatus;
    initialDraft?: string;
    refinedDraft?: string;
    error?: string;
};

export type SwarmRouterPayload = {
    reasoning: string;
    agents: Array<Pick<SwarmAgent, "id" | "name" | "role" | "perspective">>;
};

export type SwarmEvent =
    | { type: "phase"; phase: SwarmPhase }
    | { type: "router"; payload: SwarmRouterPayload }
    | { type: "agent_status"; id: string; status: SwarmAgentStatus; error?: string }
    | { type: "agent_draft"; id: string; stage: "initial" | "refined"; draft: string }
    | { type: "synth_chunk"; text: string }
    | { type: "error"; message: string }
    | { type: "done" };

export type SwarmState = {
    phase: SwarmPhase;
    reasoning: string;
    agents: SwarmAgent[];
    error?: string;
};