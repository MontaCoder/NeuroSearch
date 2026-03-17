import { groqClientAISDK, truncateContextForTokens, withRetry } from "@/utils/clients";
import { NextResponse } from "next/server";
import { SearchResults } from "@/utils/sharedTypes";
import { unstable_cache } from 'next/cache';
import { createHash } from 'crypto';
import { generateText } from 'ai';

// Create a cached version of the similar questions generation
const getCachedSimilarQuestions = unstable_cache(
  async (question: string, sourcesContext: string) => {
    const result = await generateText({
      model: groqClientAISDK("openai/gpt-oss-20b"),
      system: `You are a research assistant that generates insightful follow-up questions.

Guidelines for generating questions:
- Create 3 diverse questions that explore different aspects of the topic
- Each question must be standalone (include specific names, events, locations)
- Use the same language as the original question
- Max 20 words per question
- Vary question types: mix "what", "how", "why", "when", "where" questions
- Focus on aspects NOT fully covered in the original answer
- Do NOT repeat or rephrase the original question

Return ONLY a JSON object: {"questions": ["question1", "question2", "question3"]}`,
      messages: [
        {
          role: "user",
          content: `Original question: "${question}"

${sourcesContext ? `Context from sources:\n${sourcesContext}` : 'No additional context available.'}

Generate 3 diverse follow-up questions that explore different angles of this topic.`,
        },
      ],

    });

    try {
      const parsedResponse = JSON.parse(result.text);
      return parsedResponse.questions || [];
    } catch (error) {
      console.error('Error parsing similar questions response:', error);
      return [];
    }
  },
  ['similar-questions'],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ['similar-questions']
  }
);

export async function POST(request: Request) {
  let { question, sources } = await request.json();

  // Create context from sources with very aggressive token limiting
  // Use only the first few sources and limit each to 150 tokens to stay well under the 8000 token limit
  const maxSources = Math.min(sources?.length || 0, 2); // Limit to 2 sources max
  const sourcesContext = sources && sources.length > 0
    ? sources.slice(0, maxSources).map((source: SearchResults, index: number) =>
        `Title: ${source.title}\nContent: ${truncateContextForTokens(source.content || '', 150)}`
      ).join('\n\n')
    : '';

  // Create a cache key based on question and sources content
  const cacheKey = createHash('md5')
    .update(`${question}:${sourcesContext}`)
    .digest('hex');

  try {
    const questions = await withRetry(async () => {
      return await getCachedSimilarQuestions(question, sourcesContext);
    }, 2); // Only 2 retries for similar questions (non-critical)
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error generating similar questions:', error);
    return NextResponse.json([]); // Return empty array on failure
  }
}
