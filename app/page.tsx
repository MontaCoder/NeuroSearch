"use client";

import Answer from "@/components/Answer";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import InputArea from "@/components/InputArea";
import SimilarTopics from "@/components/SimilarTopics";
import Sources from "@/components/Sources";
import Image from "next/image";
import { useRef, useState } from "react";
import { SearchResults } from "@/utils/sharedTypes";

export default function Home() {
  const [promptValue, setPromptValue] = useState("");
  const [question, setQuestion] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [sources, setSources] = useState<SearchResults[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [answer, setAnswer] = useState("");
  const [similarQuestions, setSimilarQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleDisplayResult = async (newQuestion?: string) => {
    newQuestion = newQuestion || promptValue;

    setShowResult(true);
    setLoading(true);
    setQuestion(newQuestion);
    setPromptValue("");

    await handleSourcesAndAnswer(newQuestion);

    setLoading(false);
  };

  async function handleSourcesAndAnswer(question: string) {
    setIsLoadingSources(true);
    
    try {
      // Fetch sources first (needed for both answer and similar questions)
      let sourcesResponse = await fetch("/api/getSources", {
        method: "POST",
        body: JSON.stringify({ question }),
      });
      
      let sourcesLocal: SearchResults[] = [];
      if (sourcesResponse.ok) {
        sourcesLocal = await sourcesResponse.json();
        setSources(sourcesLocal);
      } else {
        setSources([]);
        console.error('Failed to fetch sources');
      }
      setIsLoadingSources(false);

      // Start similar questions generation in parallel (doesn't block answer)
      handleSimilarQuestions(question, sourcesLocal);

      // Fetch answer with sources
      const response = await fetch("/api/getAnswer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question, sources: sourcesLocal }),
      });

      if (!response.ok) {
        throw new Error(`Answer generation failed: ${response.statusText}`);
      }

      // Handle the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          accumulatedText += chunk;
          setAnswer(accumulatedText);
        }
      }
    } catch (error) {
      console.error('Error in handleSourcesAndAnswer:', error);
      setIsLoadingSources(false);
      // Show error state to user
      setAnswer('<p class="text-red-500">Sorry, an error occurred while generating your answer. Please try again.</p>');
    }
  }

  async function handleSimilarQuestions(
    question: string,
    sources: SearchResults[],
  ) {
    let res = await fetch("/api/getSimilarQuestions", {
      method: "POST",
      body: JSON.stringify({ question, sources }),
    });
    let questions = await res.json();
    setSimilarQuestions(questions);
  }

  const reset = () => {
    setShowResult(false);
    setPromptValue("");
    setQuestion("");
    setAnswer("");
    setSources([]);
    setSimilarQuestions([]);
  };

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
            {/* Question display */}
            <section className="border-b border-border-light bg-background-secondary py-6">
              <div className="container mx-auto px-4 max-w-4xl">
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
                    <h2 className="text-lg font-semibold text-text-primary uppercase tracking-wide mb-2">
                      Question
                    </h2>
                    <p className="text-base text-text-secondary leading-relaxed">
                      &quot;{question}&quot;
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Results sections */}
            <div className="flex-1 py-8">
              <div className="container mx-auto px-4 max-w-4xl space-y-8">
                <Sources sources={sources} isLoading={isLoadingSources} />
                <Answer answer={answer} sourceCount={sources.length} />
                <SimilarTopics
                  similarQuestions={similarQuestions}
                  handleDisplayResult={handleDisplayResult}
                  reset={reset}
                />
              </div>
            </div>

            {/* Input area */}
            <div className="border-t border-border-light bg-background-primary py-6">
              <div className="container mx-auto px-4 max-w-2xl">
                <InputArea
                  promptValue={promptValue}
                  setPromptValue={setPromptValue}
                  handleDisplayResult={handleDisplayResult}
                  disabled={loading}
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
