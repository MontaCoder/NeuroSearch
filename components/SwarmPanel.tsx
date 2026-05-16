import Image from "next/image";
import { memo, useEffect, useMemo, useState } from "react";
import { SwarmAgent, SwarmPhase, SwarmState } from "@/utils/sharedTypes";

interface SwarmPanelProps {
  state: SwarmState;
  active: boolean;
}

type PhaseStep = {
  key: SwarmPhase;
  label: string;
};

const PHASE_STEPS: PhaseStep[] = [
  { key: "router", label: "Router" },
  { key: "drafting", label: "Drafting" },
  { key: "refining", label: "Refining" },
  { key: "synthesizing", label: "Synthesizing" },
];

const PHASE_ORDER: Record<SwarmPhase, number> = {
  idle: -1,
  router: 0,
  drafting: 1,
  refining: 2,
  synthesizing: 3,
  done: 4,
  error: 4,
};

const STATUS_STYLE: Record<SwarmAgent["status"], string> = {
  waiting: "bg-background-tertiary text-text-tertiary",
  working: "bg-interactive-active text-text-primary",
  done: "bg-text-primary text-text-inverse",
  error: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<SwarmAgent["status"], string> = {
  waiting: "Waiting",
  working: "Working",
  done: "Done",
  error: "Error",
};

function stripHtml(html: string) {
  if (!html) return "";
  if (typeof document === "undefined") return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

function preview(text: string, max = 140) {
  const clean = stripHtml(text).replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function AgentCard({ agent }: { agent: SwarmAgent }) {
  const [open, setOpen] = useState(false);
  const hasContent = Boolean(agent.initialDraft || agent.refinedDraft);

  return (
    <div className="rounded-lg border border-border-light bg-background-primary p-4 transition-shadow duration-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary truncate">{agent.name}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLE[agent.status]}`}
            >
              {agent.status === "working" && (
                <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
              )}
              {STATUS_LABEL[agent.status]}
            </span>
          </div>
          {agent.perspective && (
            <p className="mt-1 text-xs leading-relaxed text-text-tertiary line-clamp-2">
              {agent.perspective}
            </p>
          )}
        </div>
        {hasContent && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-md border border-border-light bg-background-secondary px-2 py-1 text-[11px] font-medium text-text-secondary transition-colors duration-200 hover:bg-background-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-1"
            aria-expanded={open}
          >
            {open ? "Hide" : "View"}
          </button>
        )}
      </div>

      {agent.error && (
        <p className="mt-2 text-xs text-red-600">{agent.error}</p>
      )}

      {!open && agent.refinedDraft && (
        <p className="mt-3 text-xs italic text-text-tertiary line-clamp-2">
          {preview(agent.refinedDraft)}
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-3 border-t border-border-light pt-3">
          {agent.initialDraft && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                Initial draft
              </p>
              <div
                className="mt-1 max-h-56 overflow-y-auto rounded-md bg-background-secondary p-3 text-xs leading-relaxed text-text-secondary"
                dangerouslySetInnerHTML={{ __html: agent.initialDraft }}
              />
            </div>
          )}
          {agent.refinedDraft && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                Refined draft
              </p>
              <div
                className="mt-1 max-h-56 overflow-y-auto rounded-md bg-background-secondary p-3 text-xs leading-relaxed text-text-secondary"
                dangerouslySetInnerHTML={{ __html: agent.refinedDraft }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PhaseRow({ phase }: { phase: SwarmPhase }) {
  const currentIndex = PHASE_ORDER[phase];
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Swarm phases">
      {PHASE_STEPS.map((step, i) => {
        const isCurrent = step.key === phase;
        const isPast = currentIndex > i || phase === "done";
        const isError = phase === "error" && isCurrent;
        return (
          <li key={step.key}>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors duration-200 ${
                isError
                  ? "bg-red-100 text-red-700"
                  : isCurrent
                    ? "bg-text-primary text-text-inverse"
                    : isPast
                      ? "bg-background-tertiary text-text-primary"
                      : "bg-background-secondary text-text-tertiary"
              }`}
            >
              <span className="text-[10px] font-semibold opacity-70">{i + 1}.</span>
              <span>{step.label}</span>
              {isCurrent && phase !== "done" && phase !== "error" && (
                <span className="ml-0.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SwarmPanel({ state, active }: SwarmPanelProps) {
  const { phase, reasoning, agents, error } = state;

  // Auto-expand while running, collapse on done.
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    if (phase === "router" || phase === "drafting" || phase === "refining") {
      setExpanded(true);
    } else if (phase === "synthesizing" || phase === "done") {
      setExpanded(false);
    } else if (phase === "error") {
      setExpanded(true);
    }
  }, [phase]);

  const summary = useMemo(() => {
    if (phase === "error") return "Swarm encountered an error";
    if (phase === "done" || phase === "synthesizing") {
      const count = agents.length;
      return `Swarm complete · ${count} agent${count === 1 ? "" : "s"}`;
    }
    if (phase === "router") return "Designing the swarm…";
    if (phase === "drafting") {
      const done = agents.filter((a) => a.status === "done").length;
      return `Drafting ${done}/${agents.length}`;
    }
    if (phase === "refining") {
      const done = agents.filter((a) => a.status === "done" && a.refinedDraft).length;
      return `Refining ${done}/${agents.length}`;
    }
    return "Idle";
  }, [phase, agents]);

  if (!active && phase === "idle") return null;

  return (
    <section className="container mx-auto max-w-4xl px-4 py-8" aria-label="Swarm process panel">
      <div className="card-elevated card-texture p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
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
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-wide text-text-primary">
                Swarm
              </h2>
              <p className="text-xs text-text-tertiary">{summary}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg bg-background-secondary px-3 py-2 text-xs font-medium text-text-secondary transition-colors duration-200 hover:bg-background-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2"
            aria-expanded={expanded}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>

        <div className="mt-5">
          <PhaseRow phase={phase} />
        </div>

        {expanded && (
          <>
            {reasoning && (
              <div className="mt-5 rounded-lg border border-border-light bg-background-secondary p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Router reasoning
                </p>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">{reasoning}</p>
              </div>
            )}

            {agents.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            ) : phase === "router" ? (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Loading agents">
                <div className="skeleton h-24 rounded-lg" />
                <div className="skeleton h-24 rounded-lg" />
              </div>
            ) : null}

            {error && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default memo(SwarmPanel);
