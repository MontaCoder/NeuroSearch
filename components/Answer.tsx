import Image from "next/image";
import { Toaster, toast } from "react-hot-toast";

interface AnswerProps {
  answer: string;
}

export default function Answer({ answer }: AnswerProps) {
  // Function to strip HTML tags from the answer
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

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
            <div
              className="text-base leading-relaxed text-text-secondary"
              dangerouslySetInnerHTML={{ __html: answer.trim() }}
              role="article"
              aria-label="AI generated answer"
            />
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
