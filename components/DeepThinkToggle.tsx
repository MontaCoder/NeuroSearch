import { memo } from "react";

interface DeepThinkToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function DeepThinkToggle({ enabled, onToggle, disabled }: DeepThinkToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`group inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 ${
        enabled
          ? "border-text-primary bg-text-primary text-text-inverse hover:bg-text-secondary"
          : "border-border-medium bg-background-primary text-text-secondary hover:border-border-dark hover:bg-background-secondary hover:text-text-primary"
      }`}
      aria-pressed={enabled}
      aria-label={enabled ? "Disable swarm mode" : "Enable swarm mode"}
      title="Spawn multiple AI agents that research, critique, and refine in parallel. Slower, but more thorough."
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M11.052 1.658a1 1 0 0 1 1.896 0l1.65 6.4a2 2 0 0 0 1.444 1.443l6.4 1.65a1 1 0 0 1 0 1.897l-6.4 1.65a2 2 0 0 0-1.444 1.444l-1.65 6.4a1 1 0 0 1-1.896 0l-1.65-6.4a2 2 0 0 0-1.444-1.444l-6.4-1.65a1 1 0 0 1 0-1.897l6.4-1.65a2 2 0 0 0 1.444-1.443z" />
      </svg>
      <span>Swarm</span>
      {enabled && (
        <span
          className="inline-flex h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-current"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

export default memo(DeepThinkToggle);
