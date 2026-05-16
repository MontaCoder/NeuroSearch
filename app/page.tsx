"use client";

import Answer from "@/components/Answer";
import DeepThinkToggle from "@/components/DeepThinkToggle";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import InputArea from "@/components/InputArea";
import ReasoningEffortSelector from "@/components/ReasoningEffortSelector";
import SimilarTopics from "@/components/SimilarTopics";
import Sources from "@/components/Sources";
import SwarmPanel from "@/components/SwarmPanel";
import {
  DEFAULT_REASONING_EFFORT,
  ReasoningEffort,
  SearchResults,
  SwarmAgent,
  SwarmEvent,
  SwarmState,
  normalizeReasoningEffort,
} from "@/utils/sharedTypes";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const DEEP_THINK_STORAGE_KEY = "neuro-deep-think";
const REASONING_EFFORT_STORAGE_KEY = "neuro-reasoning-effort";

const INITIAL_SWARM_STATE: SwarmState = {
  phase: "idle",
  reasoning: "",
  agents: [],
};

async function fetchSources(question: string): Promise<SearchResults[]> {
  const response = await fetch("/api/getSources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return response.ok ? response.json() : [];
}

async function streamAnswer(
  question: string,
  sources: SearchResults[],
  reasoningEffort: ReasoningEffort,
  setAnswer: (a: string) => void,
  signal: AbortSignal,
) {
  const response = await fetch("/api/getAnswer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, sources, reasoningEffort }),
    signal,
  });

  if (!response.ok || !response.body) throw new Error("Answer generation failed");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        accumulated += decoder.decode(value, { stream: true });
        setAnswer(accumulated);
      }
    }
    const remaining = decoder.decode();
    if (remaining) setAnswer(accumulated + remaining);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }
}

type SwarmHandlers = {
  onEvent: (event: SwarmEvent) => void;
  signal: AbortSignal;
};

async function streamSwarm(
  question: string,
  sources: SearchResults[],
  reasoningEffort: ReasoningEffort,
  { onEvent, signal }: SwarmHandlers,
) {
  const response = await fetch("/api/swarm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, sources, reasoningEffort }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Swarm generation failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatchLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEvent(JSON.parse(trimmed) as SwarmEvent);
    } catch {
      /* ignore malformed line */
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      buffer += decoder.decode(value, { stream: true });
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        dispatchLine(line);
        newlineIndex = buffer.indexOf("\n");
      }
    }
    if (buffer) dispatchLine(buffer + decoder.decode());
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }
}

export default function Home() {
  const [promptValue, setPromptValue] = useState("");
  const [question, setQuestion] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [sources, setSources] = useState<SearchResults[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [answer, setAnswer] = useState("");
  const [similarQuestions, setSimilarQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [swarm, setSwarm] = useState<SwarmState>(INITIAL_SWARM_STATE);
  const [deepThink, setDeepThink] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
    DEFAULT_REASONING_EFFORT,
  );
  const hasAutoSearchedFromUrl = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Persisted preferences.
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem(DEEP_THINK_STORAGE_KEY) === "1") {
        setDeepThink(true);
      }
      const savedEffort = window.localStorage.getItem(REASONING_EFFORT_STORAGE_KEY);
      if (savedEffort) setReasoningEffort(normalizeReasoningEffort(savedEffort));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const toggleDeepThink = useCallback(() => {
    setDeepThink((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(DEEP_THINK_STORAGE_KEY, next ? "1" : "0");
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const changeReasoningEffort = useCallback((next: ReasoningEffort) => {
    setReasoningEffort(next);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(REASONING_EFFORT_STORAGE_KEY, next);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const updateSearchUrl = (q?: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    q?.trim() ? url.searchParams.set("q", q.trim()) : url.searchParams.delete("q");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const abortInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const handleSwarmEvent = useCallback((event: SwarmEvent) => {
    switch (event.type) {
      case "phase": {
        setSwarm((prev) =>
          event.phase === "router"
            ? { ...prev, phase: event.phase, agents: [], reasoning: "", error: undefined }
            : { ...prev, phase: event.phase },
        );
        if (event.phase === "error") {
          setAnswer(
            (prev) =>
              prev ||
              '<p class="text-red-500">The swarm encountered an error. Please try again.</p>',
          );
        }
        return;
      }
      case "router": {
        setSwarm((prev) => ({
          ...prev,
          reasoning: event.payload.reasoning,
          agents: event.payload.agents.map<SwarmAgent>((a) => ({
            id: a.id,
            name: a.name,
            role: a.role,
            perspective: a.perspective,
            status: "waiting",
          })),
        }));
        return;
      }
      case "agent_status": {
        setSwarm((prev) => ({
          ...prev,
          agents: prev.agents.map((agent) =>
            agent.id === event.id
              ? { ...agent, status: event.status, error: event.error ?? agent.error }
              : agent,
          ),
        }));
        return;
      }
      case "agent_draft": {
        setSwarm((prev) => ({
          ...prev,
          agents: prev.agents.map((agent) =>
            agent.id === event.id
              ? {
                  ...agent,
                  ...(event.stage === "initial"
                    ? { initialDraft: event.draft }
                    : { refinedDraft: event.draft }),
                }
              : agent,
          ),
        }));
        return;
      }
      case "synth_chunk": {
        setAnswer((prev) => prev + event.text);
        return;
      }
      case "error": {
        setSwarm((prev) => ({ ...prev, error: event.message }));
        return;
      }
      case "done": {
        setSwarm((prev) => ({ ...prev, phase: "done" }));
        return;
      }
    }
  }, []);

  const runWithSwarm = useCallback(
    async (resolved: string, currentSources: SearchResults[], effort: ReasoningEffort) => {
      abortInFlight();
      const controller = new AbortController();
      abortRef.current = controller;
      setSwarm({ phase: "router", reasoning: "", agents: [] });
      setAnswer("");

      try {
        await streamSwarm(resolved, currentSources, effort, {
          onEvent: handleSwarmEvent,
          signal: controller.signal,
        });
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
        setSwarm((prev) => ({
          ...prev,
          phase: "error",
          error:
            prev.error ??
            "Sorry, an error occurred while generating your answer. Please try again.",
        }));
        setAnswer(
          (prev) =>
            prev ||
            '<p class="text-red-500">Sorry, an error occurred while generating your answer. Please try again.</p>',
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [abortInFlight, handleSwarmEvent],
  );

  const runSimple = useCallback(
    async (resolved: string, currentSources: SearchResults[], effort: ReasoningEffort) => {
      abortInFlight();
      const controller = new AbortController();
      abortRef.current = controller;
      setSwarm(INITIAL_SWARM_STATE);
      setAnswer("");

      try {
        await streamAnswer(resolved, currentSources, effort, setAnswer, controller.signal);
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
        setAnswer(
          (prev) =>
            prev ||
            '<p class="text-red-500">Sorry, an error occurred while generating your answer. Please try again.</p>',
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [abortInFlight],
  );

  const runAnswer = useCallback(
    (resolved: string, currentSources: SearchResults[]) =>
      deepThink
        ? runWithSwarm(resolved, currentSources, reasoningEffort)
        : runSimple(resolved, currentSources, reasoningEffort),
    [deepThink, reasoningEffort, runWithSwarm, runSimple],
  );

  const runSearch = useCallback(
    async (nextQuestion: string) => {
      const resolved = nextQuestion.trim();
      if (!resolved) return;

      abortInFlight();
      setShowResult(true);
      setLoading(true);
      setQuestion(resolved);
      setPromptValue("");
      setAnswer("");
      setSimilarQuestions([]);
      setSwarm(INITIAL_SWARM_STATE);
      updateSearchUrl(resolved);

      try {
        setIsLoadingSources(true);
        const nextSources = await fetchSources(resolved);
        setIsLoadingSources(false);
        setSources(nextSources);

        // Run similar questions in parallel with the answer.
        fetch("/api/getSimilarQuestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: resolved, sources: nextSources }),
        })
          .then((r) => r.json())
          .then((q) => setSimilarQuestions(Array.isArray(q) ? q : []))
          .catch(() => setSimilarQuestions([]));

        await runAnswer(resolved, nextSources);
      } finally {
        setLoading(false);
      }
    },
    [abortInFlight, runAnswer],
  );

  const handleDisplayResult = async (newQuestion?: string) => {
    const resolved = (newQuestion || promptValue).trim();
    if (resolved) await runSearch(resolved);
  };

  const regenerateAnswer = useCallback(async () => {
    if (!question.trim()) return;

    abortInFlight();
    setIsRegenerating(true);
    updateSearchUrl(question);

    try {
      const nextSources = sources.length > 0 ? sources : await fetchSources(question);
      if (sources.length === 0 && nextSources.length > 0) {
        setSources(nextSources);
      }
      await runAnswer(question, nextSources);
    } finally {
      setIsRegenerating(false);
    }
  }, [abortInFlight, question, runAnswer, sources]);

  const reset = useCallback(() => {
    abortInFlight();
    updateSearchUrl();
    setShowResult(false);
    setPromptValue("");
    setQuestion("");
    setAnswer("");
    setSources([]);
    setSimilarQuestions([]);
    setIsLoadingSources(false);
    setLoading(false);
    setIsRegenerating(false);
    setSwarm(INITIAL_SWARM_STATE);
  }, [abortInFlight]);

  useEffect(() => {
    if (hasAutoSearchedFromUrl.current) return;
    hasAutoSearchedFromUrl.current = true;

    const initialQuestion = new URLSearchParams(window.location.search).get("q")?.trim();
    if (initialQuestion) void runSearch(initialQuestion);
  }, [runSearch]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  const isBusy = loading || isRegenerating;
  const swarmActive = swarm.phase !== "idle";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background-primary">
        {!showResult && (
          <Hero
            promptValue={promptValue}
            setPromptValue={setPromptValue}
            handleDisplayResult={handleDisplayResult}
            deepThink={deepThink}
            onToggleDeepThink={toggleDeepThink}
            reasoningEffort={reasoningEffort}
            onChangeReasoningEffort={changeReasoningEffort}
          />
        )}

        {showResult && (
          <div className="flex min-h-[calc(100vh-8rem)] flex-col">
            <section className="border-b border-border-light bg-background-secondary py-6">
              <div className="container mx-auto max-w-4xl px-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background-primary shadow-sm">
                    <Image
                      unoptimized
                      src="/img/message-question-circle.svg"
                      alt=""
                      width={24}
                      height={24}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="mb-2 text-lg font-semibold uppercase tracking-wide text-text-primary">
                      Question
                    </h2>
                    <p className="text-base leading-relaxed text-text-secondary">
                      &quot;{question}&quot;
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex-1 py-8">
              <div className="container mx-auto max-w-4xl space-y-8 px-4">
                <Sources sources={sources} isLoading={isLoadingSources} />
                {swarmActive && <SwarmPanel state={swarm} active={swarmActive} />}
                <Answer
                  answer={answer}
                  question={question}
                  sourceCount={sources.length}
                  onRegenerate={regenerateAnswer}
                  isRegenerating={isRegenerating}
                />
                <SimilarTopics
                  similarQuestions={similarQuestions}
                  handleDisplayResult={handleDisplayResult}
                  reset={reset}
                />
              </div>
            </div>

            <div className="border-t border-border-light bg-background-primary py-6">
              <div className="container mx-auto max-w-2xl px-4">
                <InputArea
                  promptValue={promptValue}
                  setPromptValue={setPromptValue}
                  handleDisplayResult={handleDisplayResult}
                  disabled={isBusy}
                  reset={reset}
                />
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <DeepThinkToggle enabled={deepThink} onToggle={toggleDeepThink} />
                  <ReasoningEffortSelector
                    value={reasoningEffort}
                    onChange={changeReasoningEffort}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
