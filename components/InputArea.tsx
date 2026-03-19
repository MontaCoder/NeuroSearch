import Image from "next/image";
import { FC, memo } from "react";
import TypeAnimation from "./TypeAnimation";

type TInputAreaProps = {
  promptValue: string;
  setPromptValue: React.Dispatch<React.SetStateAction<string>>;
  handleDisplayResult: () => void;
  disabled?: boolean;
  reset?: () => void;
};

const InputArea: FC<TInputAreaProps> = ({
  promptValue,
  setPromptValue,
  handleDisplayResult,
  disabled,
  reset,
}) => {
  return (
    <form
      className="group relative mx-auto flex h-16 w-full items-center justify-between rounded-xl border border-border-medium bg-background-primary px-4 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 focus-within:border-interactive-focus focus-within:shadow-xl focus-within:shadow-black/10 focus-within:ring-2 focus-within:ring-interactive-focus transition-all duration-200"
      onSubmit={(e) => {
        e.preventDefault();
        if (reset) reset();
        handleDisplayResult();
      }}
      role="search"
      aria-label="Search form"
    >
      <label htmlFor="search-input" className="sr-only">
        Search query
      </label>
      <input
        id="search-input"
        type="text"
        placeholder="Ask anything"
        className="flex-1 bg-transparent py-3 pr-4 text-base font-normal text-text-primary placeholder:text-text-tertiary outline-none focus:ring-0 focus:ring-offset-0 md:text-lg"
        disabled={disabled}
        value={promptValue}
        required
        onChange={(e) => setPromptValue(e.target.value)}
        aria-describedby="search-button"
      />

      <button
        disabled={disabled}
        type="submit"
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-text-primary text-background-primary shadow-sm hover:bg-text-secondary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-all duration-200 active:scale-95"
        aria-label={disabled ? "Searching..." : "Search"}
        id="search-button"
      >
        {disabled && (
          <div className="absolute inset-0 flex items-center justify-center">
            <TypeAnimation />
          </div>
        )}

        <Image
          unoptimized
          src="/img/arrow-narrow-right.svg"
          alt=""
          width={20}
          height={20}
          className={`transition-all duration-200 ${disabled ? "invisible opacity-0" : "visible opacity-100"}`}
          aria-hidden="true"
        />
      </button>
    </form>
  );
};

export default memo(InputArea);
