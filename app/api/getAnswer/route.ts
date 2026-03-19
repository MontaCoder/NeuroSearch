import { streamText } from 'ai';
import { SearchResults } from "@/utils/sharedTypes";
import { groqClientAISDK, buildTruncatedContext, withRetry } from '@/utils/clients';

export const maxDuration = 45;

// System prompt establishes AI role and quality expectations
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

export async function POST(request: Request) {
  try {
    const { question, sources } = await request.json();

    if (!question || typeof question !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid question format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!sources || !Array.isArray(sources)) {
      return new Response(JSON.stringify({ error: 'Invalid sources format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Limit to 5 sources to stay well under token limits
    const finalResults: SearchResults[] = sources.slice(0, 5);

    const answerPrompt = `Based on the provided sources, answer the user's question accurately and concisely.

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

Current date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

    // Use retry logic for the streaming response
    const result = await withRetry(async () => {
      return streamText({
        model: groqClientAISDK("openai/gpt-oss-120b"),
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${answerPrompt}

Question: ${question}`,
          },
        ],
        temperature: 0.3, // Lower temperature for more factual answers
        maxOutputTokens: 1024,
      });
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in getAnswer:', error);
    
    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('rate') || errorMessage.includes('429')) {
      return new Response(
        JSON.stringify({ error: 'Service is busy. Please try again in a moment.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (errorMessage.includes('timeout')) {
      return new Response(
        JSON.stringify({ error: 'Request timed out. Please try again.' }),
        { status: 504, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Answer generation failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
