import Image from "next/image";
import InputArea from "./InputArea";

interface HeroProps {
  promptValue: string;
  setPromptValue: React.Dispatch<React.SetStateAction<string>>;
  handleDisplayResult: () => void;
}

const SUGGESTIONS = [
  { id: 1, name: "How does photosynthesis work?", icon: "/img/icon _leaf_.svg" },
  { id: 2, name: "How can I get a 6 pack in 3 months?", icon: "/img/icon _dumbell_.svg" },
  { id: 3, name: "Can you explain the theory of relativity?", icon: "/img/icon _atom_.svg" },
] as const;

export default function Hero({ promptValue, setPromptValue, handleDisplayResult }: HeroProps) {
  return (
    <section className="flex flex-col items-center justify-center min-h-screen px-4 py-16 md:px-8 md:py-24 lg:px-16 lg:py-32" aria-label="Search interface">
      <a
        className="mb-6 inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border-medium bg-background-primary px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2"
        href="https://console.groq.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Powered by Groq and OpenAI - Opens in new tab"
      >
        <span className="text-sm font-medium text-text-secondary">
          Powered by <span className="text-text-primary font-semibold">Groq</span>{" "}
          <span className="text-text-tertiary">and OpenAI gpt-oss</span>
        </span>
      </a>

      <h1 className="mb-8 text-center text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl lg:text-7xl">
        <span className="block">Search smarter</span>
        <span className="block gradient-text">& faster</span>
      </h1>

      <div className="w-full max-w-2xl mb-12">
        <InputArea
          promptValue={promptValue}
          setPromptValue={setPromptValue}
          handleDisplayResult={handleDisplayResult}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-12 lg:flex-nowrap lg:justify-center">
        {SUGGESTIONS.map((item) => (
          <button
            className="group flex h-12 items-center justify-center gap-2 rounded-lg border border-border-medium bg-background-primary px-4 py-3 text-sm font-medium text-text-secondary hover:bg-background-secondary hover:border-border-dark hover:text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2 active:scale-95"
            onClick={() => setPromptValue(item.name)}
            key={item.id}
            aria-label={`Try searching: ${item.name}`}
            type="button"
          >
            <Image unoptimized src={item.icon} alt="" width={18} height={16} className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity duration-200" aria-hidden="true" />
            <span className="leading-none">{item.name}</span>
          </button>
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-text-tertiary">
          Fully open source!{" "}
          <a
            href="https://github.com/MontaCoder/neurosearch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-primary hover:text-text-secondary focus:text-text-secondary underline decoration-1 underline-offset-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2 rounded-sm"
            aria-label="View source code on GitHub - Opens in new tab"
          >
            Star it on GitHub
          </a>
        </p>
      </div>
    </section>
  );
}
