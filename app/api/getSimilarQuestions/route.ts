import { groqClientAISDK, truncateContextForTokens } from "@/utils/clients";
import { NextResponse } from "next/server";
import { SearchResults } from "@/utils/sharedTypes";
import { unstable_cache } from 'next/cache';
import { generateText } from 'ai';

const getCachedSimilarQuestions = unstable_cache(
  async (question: string, sourcesContext: string) => {
    const result = await generateText({
      model: groqClientAISDK("qwen/qwen3-32b"),
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
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result.text);
      return parsed.questions || [];
    } catch {
      console.error('Error parsing similar questions response');
      return [];
    }
  },
  ['similar-questions'],
  { revalidate: 3600, tags: ['similar-questions'] },
);

export async function POST(request: Request) {
  const { question, sources } = await request.json();

  const maxSources = Math.min(sources?.length || 0, 2);
  const sourcesContext = sources?.length > 0
    ? sources.slice(0, maxSources).map((s: SearchResults) =>
        `Title: ${s.title}\nContent: ${truncateContextForTokens(s.content || '', 150)}`
      ).join('\n\n')
    : '';

  try {
    const questions = await getCachedSimilarQuestions(question, sourcesContext);
    return NextResponse.json(questions);
  } catch {
    return NextResponse.json([]);
  }
}
