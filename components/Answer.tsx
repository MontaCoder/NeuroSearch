import Image from "next/image";
import { useMemo, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";

interface AnswerProps {
  answer: string;
  question: string;
  sourceCount?: number;
  onRegenerate: () => Promise<void> | void;
  isRegenerating?: boolean;
}

const TOAST_STYLE = { background: "#171717", color: "#ffffff" } as const;
const TOAST_OPTIONS = { duration: 2000, style: { ...TOAST_STYLE, borderRadius: "0.75rem" } };

const SourceIcon = ({ path }: { path: string }) => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
  </svg>
);

const DOC_PATH = "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";
const GLOBE_PATH = "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9";

function stripHtml(html: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export default function Answer({
  answer,
  question,
  sourceCount = 0,
  onRegenerate,
  isRegenerating = false,
}: AnswerProps) {
  const { processedAnswer, citationCount } = useMemo(() => {
    if (!answer) return { processedAnswer: "", citationCount: 0 };

    const uniqueIndices = new Set<string>();
    const processed = answer.replace(
      /\[\[citation:(\d+)\]\]/g,
      (_match, index) => {
        uniqueIndices.add(index);
        return `<a href="#source-${index}" class="citation-link inline-flex items-center gap-1 rounded bg-interactive-primary/10 px-1.5 py-0.5 text-xs font-medium text-interactive-primary transition-colors hover:bg-interactive-primary/20" onclick="event.preventDefault(); document.getElementById('source-${index}')?.scrollIntoView({behavior: 'smooth', block: 'center'});">[${parseInt(index, 10) + 1}]</a>`;
      },
    );
    return { processedAnswer: processed, citationCount: uniqueIndices.size };
  }, [answer]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(stripHtml(answer).trim());
      toast("Answer copied to clipboard", { style: TOAST_STYLE, duration: 2000 });
    } catch {
      toast("Failed to copy to clipboard", { style: TOAST_STYLE, duration: 2000 });
    }
  }, [answer]);

  const handleShare = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("q", trimmed);

    try {
      if (navigator.share) {
        await navigator.share({ title: `NeuroSearch: ${trimmed}`, text: trimmed, url: shareUrl.toString() });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl.toString());
      toast("Link copied to clipboard", { style: TOAST_STYLE, duration: 2000 });
    } catch {
      toast("Failed to share link", { style: TOAST_STYLE, duration: 2000 });
    }
  }, [question]);

  return (
    <section className="container mx-auto max-w-4xl px-4 py-8" aria-label="Answer section">
      <div className="card-elevated card-texture p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary">
              <Image unoptimized src="/img/Info.svg" alt="" width={20} height={20} className="opacity-60" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold uppercase tracking-wide text-text-primary">Answer</h2>
          </div>

          <div className="flex items-center gap-2">
            {question && (
              <button
                onClick={handleShare}
                className="group flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary text-text-secondary transition-all duration-200 hover:bg-background-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2"
                aria-label="Share search link"
                type="button"
              >
                <Image unoptimized src="/img/share.svg" alt="" width={18} height={18} className="opacity-60 transition-opacity duration-200 group-hover:opacity-100" aria-hidden="true" />
              </button>
            )}

            {question && (
              <button
                onClick={() => void onRegenerate()}
                className="rounded-lg bg-background-secondary px-3 py-2 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-background-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                aria-label="Regenerate answer"
                type="button"
                disabled={isRegenerating}
              >
                {isRegenerating ? "Regenerating..." : "Regenerate"}
              </button>
            )}

            {answer && (
              <button
                onClick={handleCopy}
                className="group flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary text-text-secondary transition-all duration-200 hover:bg-background-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2"
                aria-label="Copy answer to clipboard"
                type="button"
              >
                <Image unoptimized src="/img/copy.svg" alt="" width={18} height={18} className="opacity-60 transition-opacity duration-200 group-hover:opacity-100" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="prose prose-gray max-w-none">
          {answer ? (
            <>
              <div
                className="text-base leading-relaxed text-text-secondary"
                dangerouslySetInnerHTML={{ __html: processedAnswer.trim() }}
                role="article"
                aria-label="AI generated answer"
              />

              {(citationCount > 0 || sourceCount > 0) && (
                <div className="mt-6 flex items-center gap-4 border-t border-border-light pt-4 text-xs text-text-tertiary">
                  {citationCount > 0 && (
                    <span className="flex items-center gap-1">
                      <SourceIcon path={DOC_PATH} />
                      {citationCount} source{citationCount !== 1 ? "s" : ""} referenced
                    </span>
                  )}
                  {sourceCount > 0 && (
                    <span className="flex items-center gap-1">
                      <SourceIcon path={GLOBE_PATH} />
                      {sourceCount} source{sourceCount !== 1 ? "s" : ""} analyzed
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3" role="status" aria-label="Loading answer">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          )}
        </div>
      </div>

      <Toaster position="top-center" reverseOrder={false} toastOptions={TOAST_OPTIONS} />
    </section>
  );
}
