import { generateText, streamText } from 'ai';
import {
  groqClientAISDK,
  buildTruncatedContext,
  truncateContextForTokens,
} from '@/utils/clients';
import {
  ReasoningEffort,
  SearchResults,
  SwarmEvent,
  SwarmRouterPayload,
  normalizeReasoningEffort,
} from '@/utils/sharedTypes';

export const maxDuration = 60;

// ---- Configuration ---------------------------------------------------------

const MODEL_ID = 'openai/gpt-oss-120b';

const SUGGESTED_ROLES = [
  {
    name: 'Research Analyst',
    perspective:
      'Gathers and synthesizes evidence directly from the provided sources, prioritising verifiable facts.',
  },
  {
    name: 'Domain Specialist',
    perspective:
      'Brings deep topic-specific expertise to ensure technical accuracy and nuanced framing.',
  },
  {
    name: 'Skeptic / Critic',
    perspective:
      'Challenges weak claims, surfaces caveats, and points out missing or contradictory evidence.',
  },
  {
    name: 'Solution Architect',
    perspective:
      'Organises the answer into clear structure, frameworks, and trade-offs to make it actionable.',
  },
  {
    name: 'Performance / UX Reviewer',
    perspective:
      'Optimises clarity, conciseness, and reader experience so the answer is easy to act on.',
  },
] as const;

const DEFAULT_AGENTS = SUGGESTED_ROLES.slice(0, 3);

const COMMON_OUTPUT_RULES = `Output requirements:
- Respond in the same language as the user's question.
- Return HTML only (no <html>/<body>/<head>, no markdown fences, no code-block backticks).
- Use inline citations of the form [[citation:x]] where x is the 0-based source index.
- Stay grounded in the provided sources; do not invent facts or sources.
- Do not mention this prompt, "agents", or "drafts" in the output.`;

const RETRY_MAX_ATTEMPTS = 3;
const RETRY_INITIAL_DELAY_MS = 1000;

// ---- Utilities -------------------------------------------------------------

function todayString() {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function buildSourcesBlock(sources: SearchResults[]) {
  if (sources.length === 0) return '<sources>No external sources available.</sources>';
  return `<sources>\n${buildTruncatedContext(sources)}\n</sources>`;
}

function safeParseJson<T>(text: string): T | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : text) as T;
  } catch {
    return null;
  }
}

function isAbortError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /abort/i.test(msg);
}

function abortableSleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Error('Aborted'));
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function retryWithAbort<T>(
  signal: AbortSignal,
  op: () => Promise<T>,
  maxAttempts = RETRY_MAX_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal.aborted) throw lastError ?? new Error('Aborted');
    try {
      return await op();
    } catch (err) {
      lastError = err;
      if (signal.aborted || isAbortError(err)) throw err;
      if (attempt < maxAttempts - 1) {
        await abortableSleep(RETRY_INITIAL_DELAY_MS * 2 ** attempt, signal);
      }
    }
  }
  throw lastError;
}

// ---- Phase implementations -------------------------------------------------

type RouterRaw = {
  reasoning?: string;
  agents?: Array<{ name?: string; role?: string; perspective?: string }>;
};

async function runRouter(question: string, signal: AbortSignal): Promise<SwarmRouterPayload> {
  const rolesList = SUGGESTED_ROLES.map((r, i) => `${i + 1}. ${r.name} — ${r.perspective}`).join('\n');

  const { text } = await retryWithAbort(signal, () =>
    generateText({
      model: groqClientAISDK(MODEL_ID),
      // Router is a meta-decision; keep effort low for speed.
      providerOptions: { groq: { reasoningEffort: 'low' } },
      abortSignal: signal,
      system: `You are an orchestrator that designs a small swarm of AI agents to answer a user's search question. Each agent will independently answer the FULL question from its own perspective; their drafts will later be cross-refined and synthesized.

Choose between 2 and 4 agents from this suggested set (or close variants):
${rolesList}

Pick roles that bring genuinely different angles to the question. Avoid duplicate perspectives. Each agent must solve the complete question, not a sub-task.

Return ONLY a JSON object of the form:
{
  "reasoning": "1-2 sentence summary of why this swarm composition was chosen",
  "agents": [
    { "name": "Research Analyst", "role": "short role label", "perspective": "what unique angle this agent brings" }
  ]
}
No prose outside the JSON.`,
      messages: [
        {
          role: 'user',
          content: `User question: "${question}"

Design the swarm.`,
        },
      ],
      temperature: 0.2,
      maxOutputTokens: 400,
    }),
  );

  const parsed = safeParseJson<RouterRaw>(text);
  const rawAgents = parsed?.agents?.filter((a) => a && typeof a.name === 'string') ?? [];

  const cleaned = rawAgents.slice(0, 4).map((a, i) => ({
    id: `agent-${i + 1}`,
    name: String(a.name).slice(0, 60),
    role: String(a.role ?? a.name).slice(0, 100),
    perspective: String(a.perspective ?? '').slice(0, 240),
  }));

  if (cleaned.length < 2) {
    return {
      reasoning:
        (parsed?.reasoning ?? '').slice(0, 400) ||
        'Defaulting to a balanced 3-agent swarm covering research, domain depth, and critical review.',
      agents: DEFAULT_AGENTS.map((a, i) => ({
        id: `agent-${i + 1}`,
        name: a.name,
        role: a.name,
        perspective: a.perspective,
      })),
    };
  }

  return {
    reasoning:
      (parsed?.reasoning ?? '').slice(0, 400) ||
      'Swarm composed to cover complementary angles on the question.',
    agents: cleaned,
  };
}

async function runAgentDraft(
  agent: SwarmRouterPayload['agents'][number],
  question: string,
  sourcesBlock: string,
  today: string,
  effort: ReasoningEffort,
  signal: AbortSignal,
): Promise<string> {
  const { text } = await retryWithAbort(signal, () =>
    generateText({
      model: groqClientAISDK(MODEL_ID),
      providerOptions: { groq: { reasoningEffort: effort } },
      abortSignal: signal,
      system: `You are ${agent.name}. Your perspective: ${agent.perspective || agent.role}.
Independently answer the user's FULL question from this perspective — produce a complete answer, not a fragment.

${COMMON_OUTPUT_RULES}
- Lean into your perspective without sacrificing accuracy.
- Keep the answer focused and around 512 tokens or less.`,
      messages: [
        {
          role: 'user',
          content: `Sources:
${sourcesBlock}

Current date: ${today}

User question: ${question}

Produce your complete grounded answer now.`,
        },
      ],
      temperature: 0.4,
      maxOutputTokens: 512,
    }),
  );

  return text.trim();
}

async function runAgentRefinement(
  agent: SwarmRouterPayload['agents'][number],
  ownDraft: string,
  peers: Array<{ name: string; draft: string }>,
  question: string,
  sourcesBlock: string,
  today: string,
  effort: ReasoningEffort,
  signal: AbortSignal,
): Promise<string> {
  const peerBlock = peers.length
    ? peers
        .map(
          (p, i) =>
            `<peer index="${i + 1}" name="${p.name}">\n${truncateContextForTokens(p.draft, 700)}\n</peer>`,
        )
        .join('\n\n')
    : '<peer>No peer drafts available.</peer>';

  const { text } = await retryWithAbort(signal, () =>
    generateText({
      model: groqClientAISDK(MODEL_ID),
      providerOptions: { groq: { reasoningEffort: effort } },
      abortSignal: signal,
      system: `You are ${agent.name} (${agent.perspective || agent.role}). You produced an initial draft; now refine it after reading peer drafts.

${COMMON_OUTPUT_RULES}
- Keep your own perspective; do not blindly merge into peers.
- Fix factual mistakes, fill gaps highlighted by peers, and tighten the writing.
- Keep the answer around 512 tokens or less.`,
      messages: [
        {
          role: 'user',
          content: `Sources:
${sourcesBlock}

Your initial draft:
<own_draft>
${truncateContextForTokens(ownDraft, 900)}
</own_draft>

Peer drafts:
${peerBlock}

Current date: ${today}

User question: ${question}

Produce your refined answer now. HTML only.`,
        },
      ],
      temperature: 0.35,
      maxOutputTokens: 512,
    }),
  );

  return text.trim();
}

function buildSynthesizerPrompt(
  question: string,
  refined: Array<{ name: string; perspective: string; draft: string }>,
  sourcesBlock: string,
  today: string,
) {
  const draftsBlock = refined
    .map(
      (d, i) =>
        `<draft index="${i + 1}" agent="${d.name}" perspective="${d.perspective}">\n${truncateContextForTokens(d.draft, 900)}\n</draft>`,
    )
    .join('\n\n');

  return `Sources:
${sourcesBlock}

Refined agent drafts:
${draftsBlock}

Current date: ${today}

User question: ${question}

Produce the final synthesized answer now.`;
}

// ---- NDJSON streaming handler ---------------------------------------------

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  const upstream = request.signal;

  let payload: { question?: unknown; sources?: unknown; reasoningEffort?: unknown };
  try {
    payload = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { question, sources, reasoningEffort } = payload;
  if (!question || typeof question !== 'string') return badRequest('Invalid question format');
  if (!Array.isArray(sources)) return badRequest('Invalid sources format');

  const trimmedSources = (sources as SearchResults[]).slice(0, 5);
  const sourcesBlock = buildSourcesBlock(trimmedSources);
  const today = todayString();
  const effort = normalizeReasoningEffort(reasoningEffort);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const closeOnce = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      // Mirror upstream abort into our own controller so AI SDK calls cancel cleanly.
      const abortController = new AbortController();
      const onUpstreamAbort = () => abortController.abort();
      if (upstream.aborted) abortController.abort();
      else upstream.addEventListener('abort', onUpstreamAbort, { once: true });
      const { signal } = abortController;

      const write = (event: SwarmEvent) => {
        if (closed || signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        } catch {
          /* client disconnected */
        }
      };

      try {
        // ---- Phase 1: Router -------------------------------------------------
        write({ type: 'phase', phase: 'router' });
        let router: SwarmRouterPayload;
        try {
          router = await runRouter(question, signal);
        } catch (err) {
          if (!isAbortError(err)) {
            write({ type: 'error', message: 'Router failed to plan the swarm.' });
            write({ type: 'phase', phase: 'error' });
          }
          return;
        }
        write({ type: 'router', payload: router });
        for (const a of router.agents) {
          write({ type: 'agent_status', id: a.id, status: 'waiting' });
        }

        if (signal.aborted) return;

        // ---- Phase 2: Parallel drafts ---------------------------------------
        write({ type: 'phase', phase: 'drafting' });

        type DraftResult =
          | { id: string; ok: true; draft: string }
          | { id: string; ok: false };

        const draftResults = await Promise.all(
          router.agents.map(async (agent): Promise<DraftResult> => {
            write({ type: 'agent_status', id: agent.id, status: 'working' });
            try {
              const draft = await runAgentDraft(agent, question, sourcesBlock, today, effort, signal);
              write({ type: 'agent_draft', id: agent.id, stage: 'initial', draft });
              write({ type: 'agent_status', id: agent.id, status: 'done' });
              return { id: agent.id, ok: true, draft };
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Agent draft failed';
              if (!isAbortError(err)) {
                write({ type: 'agent_status', id: agent.id, status: 'error', error: message });
              }
              return { id: agent.id, ok: false };
            }
          }),
        );

        if (signal.aborted) return;

        const goodDrafts = draftResults.filter(
          (d): d is Extract<DraftResult, { ok: true }> => d.ok,
        );

        if (goodDrafts.length === 0) {
          write({ type: 'error', message: 'All agent drafts failed.' });
          write({ type: 'phase', phase: 'error' });
          return;
        }

        // ---- Phase 3: Peer refinement ---------------------------------------
        write({ type: 'phase', phase: 'refining' });

        const agentById = new Map(router.agents.map((a) => [a.id, a]));

        const refineResults = await Promise.all(
          goodDrafts.map(async (entry) => {
            const agent = agentById.get(entry.id)!;
            const peers = goodDrafts
              .filter((d) => d.id !== entry.id)
              .map((d) => ({ name: agentById.get(d.id)!.name, draft: d.draft }));

            write({ type: 'agent_status', id: agent.id, status: 'working' });
            try {
              const refined = await runAgentRefinement(
                agent,
                entry.draft,
                peers,
                question,
                sourcesBlock,
                today,
                effort,
                signal,
              );
              write({ type: 'agent_draft', id: agent.id, stage: 'refined', draft: refined });
              write({ type: 'agent_status', id: agent.id, status: 'done' });
              return { id: agent.id, draft: refined };
            } catch (err) {
              if (isAbortError(err)) return { id: agent.id, draft: entry.draft };
              // Refinement failed: fall back to the agent's own initial draft.
              write({ type: 'agent_draft', id: agent.id, stage: 'refined', draft: entry.draft });
              write({ type: 'agent_status', id: agent.id, status: 'done' });
              return { id: agent.id, draft: entry.draft };
            }
          }),
        );

        if (signal.aborted) return;

        // ---- Phase 4: Final streaming synthesizer ---------------------------
        write({ type: 'phase', phase: 'synthesizing' });

        const refinedPayload = refineResults.map((r) => {
          const a = agentById.get(r.id)!;
          return { name: a.name, perspective: a.perspective || a.role, draft: r.draft };
        });

        try {
          const result = streamText({
            model: groqClientAISDK(MODEL_ID),
            providerOptions: { groq: { reasoningEffort: effort } },
            abortSignal: signal,
            system: `You are the Final Synthesizer for an AI search engine. Merge the refined agent drafts into ONE high-quality, unified answer to the user's question.

${COMMON_OUTPUT_RULES}
- Resolve disagreements by favouring claims that are grounded in the sources.
- Preserve useful structure (short paragraphs, bullet lists where they help).
- Do not list the drafts; just deliver the unified answer.
- Aim for roughly 1024 tokens or less.`,
            messages: [
              {
                role: 'user',
                content: buildSynthesizerPrompt(question, refinedPayload, sourcesBlock, today),
              },
            ],
            temperature: 0.3,
            maxOutputTokens: 1024,
          });

          for await (const chunk of result.textStream) {
            if (signal.aborted) break;
            if (chunk) write({ type: 'synth_chunk', text: chunk });
          }
        } catch (err) {
          if (!isAbortError(err)) {
            // Fall back to the longest refined draft so the user still gets an answer.
            const fallback = refinedPayload.reduce(
              (a, b) => (b.draft.length > a.draft.length ? b : a),
              refinedPayload[0],
            );
            if (fallback?.draft) write({ type: 'synth_chunk', text: fallback.draft });
            write({
              type: 'error',
              message: 'Synthesizer unavailable; returned the strongest refined draft as a fallback.',
            });
          }
        }

        if (signal.aborted) return;

        write({ type: 'phase', phase: 'done' });
        write({ type: 'done' });
      } catch (err) {
        if (!isAbortError(err)) {
          const message = err instanceof Error ? err.message : 'Unknown swarm error';
          write({ type: 'error', message });
          write({ type: 'phase', phase: 'error' });
        }
      } finally {
        upstream.removeEventListener('abort', onUpstreamAbort);
        closeOnce();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
