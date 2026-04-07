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

const ANSWER_ERROR_MESSAGE =
  '<p class="text-red-500">Sorry, an error occurred while generating your answer. Please try again.</p>';

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

  const updateSearchUrl = useCallback((nextQuestion?: string) => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const trimmedQuestion = nextQuestion?.trim();

    if (trimmedQuestion) {
      url.searchParams.set("q", trimmedQuestion);
    } else {
      url.searchParams.delete("q");
    }

    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  const fetchSimilarQuestions = useCallback(
    async (nextQuestion: string, nextSources: SearchResults[]) => {
      try {
        const response = await fetch("/api/getSimilarQuestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: nextQuestion,
            sources: nextSources,
          }),
        });

        const questions = await response.json();
        setSimilarQuestions(Array.isArray(questions) ? questions : []);
      } catch (error) {
        console.error("Error generating similar questions:", error);
        setSimilarQuestions([]);
      }
    },
    [],
  );

  const fetchSources = useCallback(async (nextQuestion: string) => {
    setIsLoadingSources(true);

    try {
      const response = await fetch("/api/getSources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: nextQuestion }),
      });

      if (!response.ok) {
        setSources([]);
        console.error("Failed to fetch sources");
        return [];
      }

      const nextSources: SearchResults[] = await response.json();
      setSources(nextSources);
      return nextSources;
    } catch (error) {
      console.error("Error fetching sources:", error);
      setSources([]);
      return [];
    } finally {
      setIsLoadingSources(false);
    }
  }, []);

  const streamAnswer = useCallback(
    async (nextQuestion: string, nextSources: SearchResults[]) => {
      try {
        const response = await fetch("/api/getAnswer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: nextQuestion,
            sources: nextSources,
          }),
        });

        if (!response.ok) {
          throw new Error(`Answer generation failed: ${response.statusText}`);
        }

        const reader = response.body?.getReader();

        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let done = false;
        let accumulatedText = "";
        let pendingText = "";
        let animationFrameId: number | null = null;

        const flushAnswerBuffer = () => {
          if (!pendingText) {
            return;
          }

          accumulatedText += pendingText;
          pendingText = "";
          setAnswer(accumulatedText);
        };

        const scheduleAnswerFlush = () => {
          if (animationFrameId !== null) {
            return;
          }

          animationFrameId = window.requestAnimationFrame(() => {
            animationFrameId = null;
            flushAnswerBuffer();
          });
        };

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;

          if (value) {
            const chunk = decoder.decode(value, { stream: true });

            if (chunk) {
              pendingText += chunk;
              scheduleAnswerFlush();
            }
          }
        }

        const remainingText = decoder.decode();

        if (remainingText) {
          pendingText += remainingText;
        }

        if (animationFrameId !== null) {
          window.cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }

        flushAnswerBuffer();
      } catch (error) {
        console.error("Error streaming answer:", error);
        setAnswer(ANSWER_ERROR_MESSAGE);
      }
    },
    [],
  );

  const runSearch = useCallback(
    async (nextQuestion: string) => {
      const resolvedQuestion = nextQuestion.trim();

      if (!resolvedQuestion) {
        return;
      }

      setShowResult(true);
      setLoading(true);
      setQuestion(resolvedQuestion);
      setPromptValue("");
      setAnswer("");
      setSimilarQuestions([]);
      updateSearchUrl(resolvedQuestion);

      try {
        const nextSources = await fetchSources(resolvedQuestion);
        void fetchSimilarQuestions(resolvedQuestion, nextSources);
        await streamAnswer(resolvedQuestion, nextSources);
      } finally {
        setLoading(false);
      }
    },
    [fetchSimilarQuestions, fetchSources, streamAnswer, updateSearchUrl],
  );

  const handleDisplayResult = useCallback(
    async (newQuestion?: string) => {
      const resolvedQuestion = (newQuestion || promptValue).trim();

      if (!resolvedQuestion) {
        return;
      }

      await runSearch(resolvedQuestion);
    },
    [promptValue, runSearch],
  );

  const regenerateAnswer = useCallback(async () => {
    const activeQuestion = question.trim();

    if (!activeQuestion) {
      return;
    }

    setIsRegenerating(true);
    setAnswer("");
    updateSearchUrl(activeQuestion);

    try {
      const nextSources =
        sources.length > 0 ? sources : await fetchSources(activeQuestion);

      if (sources.length === 0 && nextSources.length > 0) {
        void fetchSimilarQuestions(activeQuestion, nextSources);
      }

      await streamAnswer(activeQuestion, nextSources);
    } finally {
      setIsRegenerating(false);
    }
  }, [
    fetchSimilarQuestions,
    fetchSources,
    question,
    sources,
    streamAnswer,
    updateSearchUrl,
  ]);

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
  }, [updateSearchUrl]);

  useEffect(() => {
    if (hasAutoSearchedFromUrl.current) {
      return;
    }

    hasAutoSearchedFromUrl.current = true;

    const initialQuestion = new URLSearchParams(window.location.search)
      .get("q")
      ?.trim();

    if (initialQuestion) {
      void runSearch(initialQuestion);
    }
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
