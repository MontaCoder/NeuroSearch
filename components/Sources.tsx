import Image from "next/image";
import SourceCard from "./SourceCard";
import { SearchResults } from "@/utils/sharedTypes";

interface SourcesProps {
  sources: SearchResults[];
  isLoading: boolean;
}

export default function Sources({ sources, isLoading }: SourcesProps) {
  return (
    <section
      className="container mx-auto px-4 py-8 max-w-4xl"
      aria-label="Sources section"
    >
      <div className="card-elevated card-texture p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary">
            <Image
              unoptimized
              src="/img/sources.svg"
              alt=""
              width={20}
              height={20}
              className="opacity-60"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-lg font-semibold text-text-primary uppercase tracking-wide">
            Sources
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={index}
                  className="skeleton h-20 rounded-lg"
                  role="status"
                  aria-label="Loading source"
                />
              ))}
            </>
          ) : sources.length > 0 ? (
            sources.map((source) => (
              <SourceCard source={source} key={source.url} />
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-text-tertiary">
                Could not fetch sources.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
