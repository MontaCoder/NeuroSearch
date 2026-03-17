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

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Retry an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Estimate token count more accurately using word count heuristic
 * More accurate than simple char/4 for English text
 */
export function estimateTokenCount(text: string): number {
  // Rough heuristic: tokens ≈ words * 1.3 for English
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.ceil(words * 1.3);
}

export function truncateContextForTokens(content: string, maxTokens: number = MAX_TOKENS): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (content.length <= maxChars) {
    return content;
  }
  
  // Try to truncate at sentence boundary
  const truncated = content.substring(0, maxChars - 100);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  
  if (lastSentenceEnd > maxChars * 0.5) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }
  
  return truncated + "...";
}

export function buildTruncatedContext(sources: any[], maxTokens: number = MAX_TOKENS): string {
  // Sort sources by content length (prefer longer, more detailed sources)
  const sortedSources = [...sources].sort((a, b) => 
    (b.content?.length || 0) - (a.content?.length || 0)
  );
  
  // Allocate tokens dynamically based on source quality
  const totalContentLength = sortedSources.reduce((sum, s) => sum + (s.content?.length || 0), 0);
  
  return sortedSources.map((source, index) => {
    const content = source.content || '';
    // Allocate proportionally, with minimum guarantee
    const allocatedTokens = Math.max(
      100, // Minimum tokens per source
      Math.floor((content.length / Math.max(totalContentLength, 1)) * MAX_TOKENS)
    );
    const truncatedContent = truncateContextForTokens(content, allocatedTokens);
    return `[[citation:${index}]] ${truncatedContent}`;
  }).join('\n\n');
}