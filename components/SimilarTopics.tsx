import Image from "next/image";

interface SimilarTopicsProps {
  similarQuestions: string[];
  handleDisplayResult: (item: string) => void;
  reset: () => void;
}

const SimilarTopics = ({
  similarQuestions,
  handleDisplayResult,
  reset,
}: SimilarTopicsProps) => {
  return (
    <section
      className="container mx-auto px-4 py-8 max-w-4xl"
      aria-label="Similar topics section"
    >
      <div className="card-elevated card-texture p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary">
            <Image
              unoptimized
              src="/img/similarTopics.svg"
              alt=""
              width={20}
              height={20}
              className="opacity-60"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-lg font-semibold text-text-primary uppercase tracking-wide">
            Similar topics
          </h2>
        </div>

        <div className="space-y-1">
          {similarQuestions.length > 0 ? (
            similarQuestions.map((item, index) => (
              <button
                className="group flex w-full items-center gap-4 rounded-lg p-4 text-left transition-all duration-200 hover:bg-background-secondary focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2"
                key={item}
                onClick={() => {
                  reset();
                  handleDisplayResult(item);
                }}
                aria-label={`Search for: ${item}`}
                type="button"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-tertiary opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                  <Image
                    unoptimized
                    src="/img/arrow-circle-up-right.svg"
                    alt=""
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                </div>
                <p className="flex-1 text-sm font-medium text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors duration-200">
                  {item}
                </p>
              </button>
            ))
          ) : (
            <div className="space-y-3" role="status" aria-label="Loading similar topics">
              <div className="skeleton h-16 rounded-lg" />
              <div className="skeleton h-16 rounded-lg" />
              <div className="skeleton h-16 rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SimilarTopics;
