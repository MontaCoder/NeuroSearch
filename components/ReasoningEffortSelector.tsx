import { memo } from "react";
import { REASONING_EFFORTS, ReasoningEffort } from "@/utils/sharedTypes";

interface ReasoningEffortSelectorProps {
  value: ReasoningEffort;
  onChange: (next: ReasoningEffort) => void;
  disabled?: boolean;
}

const LABELS: Record<ReasoningEffort, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const DESCRIPTIONS: Record<ReasoningEffort, string> = {
  low: "Fastest. Light reasoning, best for simple questions.",
  medium: "Balanced reasoning and speed.",
  high: "Most thorough reasoning. Slower, best for hard questions.",
};

function ReasoningEffortSelector({
  value,
  onChange,
  disabled,
}: ReasoningEffortSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Reasoning effort"
      className={`inline-flex h-9 items-center gap-1 rounded-full border border-border-medium bg-background-primary p-1 ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <span
        className="px-2 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary select-none"
        aria-hidden="true"
      >
        Effort
      </span>
      {REASONING_EFFORTS.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${LABELS[option]} reasoning effort`}
            title={DESCRIPTIONS[option]}
            onClick={() => onChange(option)}
            disabled={disabled}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 ${
              active
                ? "bg-text-primary text-text-inverse"
                : "text-text-secondary hover:bg-background-secondary hover:text-text-primary"
            }`}
          >
            {LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}

export default memo(ReasoningEffortSelector);
