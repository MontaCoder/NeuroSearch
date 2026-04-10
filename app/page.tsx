"use client";

import Answer from "@/components/Answer";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import InputArea from "@/components/InputArea";
import SimilarTopics from "@/components/SimilarTopics";
import Sources from "@/components/Sources";
import { SearchResults } from "@/utils/sharedTypes";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

async function fetchSources(question: string): Promise<SearchResults[]> {
  const response = await fetch("/api/getSources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return response.ok ? response.json() : [];
}

async function streamAnswer(question: string, sources: SearchResults[], setAnswer: (a: string) => void) {
  const response = await fetch("/api/getAnswer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, sources }),
  });

  if (!response.ok || !response.body) throw new Error("Answer generation failed");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

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
  const hasAutoSearchedFromUrl = useRef(false);

  const updateSearchUrl = (q?: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    q?.trim() ? url.searchParams.set("q", q.trim()) : url.searchParams.delete("q");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const runSearch = useCallback(
    async (nextQuestion: string) => {
      const resolved = nextQuestion.trim();
      if (!resolved) return;

      setShowResult(true);
      setLoading(true);
      setQuestion(resolved);
      setPromptValue("");
      setAnswer("");
      setSimilarQuestions([]);
      updateSearchUrl(resolved);

      try {
        setIsLoadingSources(true);
        const nextSources = await fetchSources(resolved);
        setIsLoadingSources(false);
        setSources(nextSources);

        // Run these in parallel
        fetch("/api/getSimilarQuestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: resolved, sources: nextSources }),
        })
          .then((r) => r.json())
          .then((q) => setSimilarQuestions(Array.isArray(q) ? q : []))
          .catch(() => setSimilarQuestions([]));

        await streamAnswer(resolved, nextSources, setAnswer);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleDisplayResult = async (newQuestion?: string) => {
    const resolved = (newQuestion || promptValue).trim();
    if (resolved) await runSearch(resolved);
  };

  const regenerateAnswer = useCallback(async () => {
    if (!question.trim()) return;

    setIsRegenerating(true);
    setAnswer("");
    updateSearchUrl(question);

    try {
      const nextSources = sources.length > 0 ? sources : await fetchSources(question);
      if (sources.length === 0 && nextSources.length > 0) {
        setSources(nextSources);
      }
      await streamAnswer(question, nextSources, setAnswer);
    } catch {
      setAnswer('<p class="text-red-500">Sorry, an error occurred while generating your answer. Please try again.</p>');
    } finally {
      setIsRegenerating(false);
    }
  }, [question, sources]);

  const reset = useCallback(() => {
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
  }, []);

  useEffect(() => {
    if (hasAutoSearchedFromUrl.current) return;
    hasAutoSearchedFromUrl.current = true;

    const initialQuestion = new URLSearchParams(window.location.search).get("q")?.trim();
    if (initialQuestion) void runSearch(initialQuestion);
  }, [runSearch]);

  const isBusy = loading || isRegenerating;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background-primary">
        {!showResult && (
          <Hero
            promptValue={promptValue}
            setPromptValue={setPromptValue}
            handleDisplayResult={handleDisplayResult}
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
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
