import { SearchResults } from "@/utils/sharedTypes";
import Image from "next/image";

interface SourceCardProps {
  source: SearchResults;
}

const SourceCard = ({ source }: SourceCardProps) => {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href={source.url}
      className="group flex items-center gap-3 rounded-lg border border-border-medium bg-background-primary p-4 shadow-sm hover:shadow-md hover:border-border-dark transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2"
      aria-label={`Visit source: ${source.title}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-background-secondary overflow-hidden">
        <Image
          unoptimized
          src={`https://www.google.com/s2/favicons?domain=${source.url}&sz=128`}
          alt=""
          className="h-6 w-6"
          width={24}
          height={24}
          aria-hidden="true"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-text-primary line-clamp-2 leading-tight group-hover:text-text-secondary transition-colors duration-200">
          {source.title}
        </h3>
        <p className="text-xs text-text-tertiary truncate mt-1">
          {source.url}
        </p>
      </div>
    </a>
  );
};

export default SourceCard;
