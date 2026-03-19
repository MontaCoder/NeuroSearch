import Image from "next/image";
import { Toaster, toast } from "react-hot-toast";
import { useMemo } from "react";

interface AnswerProps {
  answer: string;
  sourceCount?: number;
}

export default function Answer({ answer, sourceCount = 0 }: AnswerProps) {
  // Function to strip HTML tags from the answer
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const { processedAnswer, citationCount } = useMemo(() => {
    if (!answer) {
      return {
        processedAnswer: '',
        citationCount: 0,
      };
    }
    
    const uniqueIndices = new Set<string>();
    const processed = answer.replace(/\[\[citation:(\d+)\]\]/g, (_match, index) => {
      uniqueIndices.add(index);
      return `<a href="#source-${index}" class="citation-link inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-interactive-primary bg-interactive-primary/10 rounded hover:bg-interactive-primary/20 transition-colors" onclick="event.preventDefault(); document.getElementById('source-${index}')?.scrollIntoView({behavior: 'smooth', block: 'center'});">[${parseInt(index) + 1}]</a>`;
    });

    return {
      processedAnswer: processed,
      citationCount: uniqueIndices.size,
    };
  }, [answer]);

  const handleCopy = async () => {
    try {
      const textOnly = stripHtml(answer);
      await navigator.clipboard.writeText(textOnly.trim());
      toast("Answer copied to clipboard", {
        icon: "📋",
        style: {
          background: '#171717',
          color: '#ffffff',
        },
        duration: 2000,
      });
    } catch (error) {
      toast("Failed to copy to clipboard", {
        icon: "❌",
        style: {
          background: '#171717',
          color: '#ffffff',
        },
        duration: 2000,
      });
    }
  };

  return (
    <section
      className="container mx-auto px-4 py-8 max-w-4xl"
      aria-label="Answer section"
    >
      <div className="card-elevated card-texture p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary">
              <Image
                unoptimized
                src="/img/Info.svg"
                alt=""
                width={20}
                height={20}
                className="opacity-60"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-lg font-semibold text-text-primary uppercase tracking-wide">
              Answer
            </h2>
          </div>

          {answer && (
            <button
              onClick={handleCopy}
              className="group flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary text-text-secondary hover:bg-background-tertiary hover:text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2"
              aria-label="Copy answer to clipboard"
              type="button"
            >
              <Image
                unoptimized
                src="/img/copy.svg"
                alt=""
                width={18}
                height={18}
                className="opacity-60 group-hover:opacity-100 transition-opacity duration-200"
                aria-hidden="true"
              />
            </button>
          )}
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
              
              {/* Answer metadata */}
              <div className="mt-6 pt-4 border-t border-border-light flex items-center gap-4 text-xs text-text-tertiary">
                {citationCount > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {citationCount} source{citationCount !== 1 ? 's' : ''} referenced
                  </span>
                )}
                {sourceCount > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {sourceCount} source{sourceCount !== 1 ? 's' : ''} analyzed
                  </span>
                )}
              </div>
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

      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 2000,
          style: {
            background: '#171717',
            color: '#ffffff',
            borderRadius: '0.75rem',
          },
        }}
      />
    </section>
  );
}
