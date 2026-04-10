import { streamText } from 'ai';
import { SearchResults } from "@/utils/sharedTypes";
import { groqClientAISDK, buildTruncatedContext, withRetry } from '@/utils/clients';

export const maxDuration = 45;

const SYSTEM_PROMPT = `You are an expert research assistant with deep knowledge across many domains. Your role is to provide accurate, well-structured answers based on the provided sources.

Guidelines:
- Answer in the same language as the user's question
- Be concise but comprehensive
- Structure your answer with clear sections when appropriate
- Use inline citations [[citation:x]] to reference sources
- If information is insufficient, say "Based on available sources, " followed by what you can determine
- Include the current date context when discussing time-sensitive information
- Do not repeat information or add unnecessary filler
- Prioritize accuracy over speed`;

const ERROR_RESPONSES = {
  rateLimit: new Response(
    JSON.stringify({ error: 'Service is busy. Please try again in a moment.' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  ),
  timeout: new Response(
    JSON.stringify({ error: 'Request timed out. Please try again.' }),
    { status: 504, headers: { 'Content-Type': 'application/json' } },
  ),
  generic: new Response(
    JSON.stringify({ error: 'Answer generation failed. Please try again.' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } },
  ),
} as const;

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  try {
    const { question, sources } = await request.json();

    if (!question || typeof question !== 'string') return badRequest('Invalid question format');
    if (!sources || !Array.isArray(sources)) return badRequest('Invalid sources format');

    const finalResults: SearchResults[] = sources.slice(0, 5);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const result = await withRetry(async () => streamText({
      model: groqClientAISDK("openai/gpt-oss-120b"),
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Based on the provided sources, answer the user's question accurately and concisely.

Sources:
<sources>
${buildTruncatedContext(finalResults)}
</sources>

Instructions:
- Use inline citations [[citation:x]] to reference specific sources
- Structure your answer clearly with sections if needed
- Limit to 1024 tokens
- If sources don't provide enough information, acknowledge this clearly
- Return as HTML (no body/head tags, no markdown)

Current date: ${today}

Question: ${question}`,
      }],
      temperature: 0.3,
      maxOutputTokens: 1024,
    }));

    return result.toTextStreamResponse();
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('rate') || msg.includes('429')) return ERROR_RESPONSES.rateLimit;
    if (msg.includes('timeout')) return ERROR_RESPONSES.timeout;
    return ERROR_RESPONSES.generic;
  }
}
