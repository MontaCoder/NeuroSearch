import { NextResponse } from "next/server";
import { exaClient, withRetry } from "@/utils/clients";
import { SearchResults } from "@/utils/sharedTypes";

// Configurable excluded sites (can be moved to env vars)
const DEFAULT_EXCLUDED_SITES = ["youtube.com", "nytimes.com", "x.com"];

export async function POST(request: Request) {
  const { question } = await request.json();

  if (!question || typeof question !== 'string') {
    return NextResponse.json(
      { error: 'Invalid question format' },
      { status: 400 }
    );
  }

  try {
    // Use retry logic for Exa API calls
    const response = await withRetry(async () => {
      return await exaClient.searchAndContents(question, {
        numResults: 9,
        excludeDomains: DEFAULT_EXCLUDED_SITES,
        type: "auto",
        // Add text content options for better results
        text: {
          maxCharacters: 2000, // Limit content length per source
        },
      });
    });

    // Filter and clean results
    const results: SearchResults[] = response.results
      .filter((result) => result.text && result.text.length > 100) // Filter out thin content
      .map((result) => ({
        title: result.title || 'Untitled',
        url: result.url,
        content: result.text || '',
      }));

    if (results.length === 0) {
      console.warn('No valid results found for query:', question);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Exa search error:", error);
    return NextResponse.json(
      { error: 'Search service temporarily unavailable. Please try again.' },
      { status: 503 }
    );
  }
}
