import Exa from "exa-js";
import { createGroq } from '@ai-sdk/groq';
import { SearchResults } from './sharedTypes';

export const groqClientAISDK = createGroq({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://groq.helicone.ai/openai/v1",
  headers: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
  },
});

export const exaClient = new Exa(process.env.EXA_API_KEY);

// Token limiting: conservative estimate 1 token ≈ 4 chars
const MAX_TOKENS = 5000;
const CHARS_PER_TOKEN = 4;

// Retry with exponential backoff
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  initialDelay = INITIAL_RETRY_DELAY,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = initialDelay * 2 ** attempt;
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

function truncateAtSentence(content: string, maxChars: number): string {
  const truncated = content.substring(0, maxChars - 100);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
  );
  return lastSentenceEnd > maxChars * 0.5
    ? truncated.substring(0, lastSentenceEnd + 1)
    : truncated + '...';
}

export function truncateContextForTokens(
  content: string,
  maxTokens = MAX_TOKENS,
): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  return content.length <= maxChars
    ? content
    : truncateAtSentence(content, maxChars);
}

export function buildTruncatedContext(
  sources: SearchResults[],
  maxTokens = MAX_TOKENS,
): string {
  const totalContentLength = sources.reduce(
    (sum, s) => sum + (s.content?.length || 0),
    0,
  );

  return sources
    .map((source, index) => {
      const content = source.content || '';
      const allocatedTokens = Math.max(
        100,
        Math.floor(
          (content.length / Math.max(totalContentLength, 1)) * maxTokens,
        ),
      );
      return `[[citation:${index}]] ${truncateContextForTokens(content, allocatedTokens)}`;
    })
    .join('\n\n');
}