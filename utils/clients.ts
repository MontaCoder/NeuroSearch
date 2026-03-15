import Exa from "exa-js";
import { createGroq } from '@ai-sdk/groq';

export const groqClientAISDK = createGroq({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://groq.helicone.ai/openai/v1",
  headers: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
  },
});

export const exaClient = new Exa(process.env.EXA_API_KEY);

// Token limiting utility for Groq API
// Groq has an 8000 token limit per request
// Using conservative estimate: 1 token ≈ 4 characters
// Leave 2000 tokens buffer for system prompt and user question
const MAX_TOKENS = 5000; // More conservative limit
const CHARS_PER_TOKEN = 4;

export function truncateContextForTokens(content: string, maxTokens: number = MAX_TOKENS): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (content.length <= maxChars) {
    return content;
  }
  return content.substring(0, maxChars - 100) + "..."; // Add ellipsis to indicate truncation
}

export function buildTruncatedContext(sources: any[], maxTokens: number = MAX_TOKENS): string {
  const availableTokens = maxTokens;
  const charsPerSource = Math.floor((availableTokens * CHARS_PER_TOKEN) / sources.length);

  return sources.map((source, index) => {
    const content = source.content || '';
    const truncatedContent = truncateContextForTokens(content, Math.floor(charsPerSource / CHARS_PER_TOKEN));
    return `[[citation:${index}]] ${truncatedContent}`;
  }).join('\n\n');
}