import { groqClientAISDK, truncateContextForTokens } from "@/utils/clients";
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
      system: `
        You are a helpful assistant that helps the user to ask related questions, based on user's original question and the search results found for that question. Please identify worthwhile topics that can be follow-ups, and write 3 questions no longer than 20 words each. Please make sure that specifics, like events, names, locations, are included in follow up questions so they can be asked standalone. For example, if the original question asks about "the Manhattan project", in the follow up question, do not just say "the project", but use the full name "the Manhattan project". Your related questions must be in the same language as the original question.

        Use the search results below to generate more relevant and specific follow-up questions that dive deeper into the topic or explore related aspects mentioned in the sources.

        Please provide these 3 related questions as a JSON object with a "questions" array containing 3 strings. Do NOT repeat the original question. ONLY return the JSON object, I will get fired if you don't return JSON.`,
      messages: [
        {
          role: "user",
          content: `Original question: ${question}

${sourcesContext ? `Search results:\n${sourcesContext}` : ''}

Generate 3 related follow-up questions based on the original question and the search results above.`,
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
    const questions = await getCachedSimilarQuestions(question, sourcesContext);
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error generating similar questions:', error);
    return NextResponse.json([]);
  }
}
