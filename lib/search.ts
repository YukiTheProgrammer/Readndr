import OpenAI from "openai";

export interface PaperResult {
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  pdfUrl: string | null;
  source: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function searchPapers(query: string): Promise<PaperResult[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini-search-preview",
    web_search_options: {
      search_context_size: "medium",
    },
    messages: [
      {
        role: "system",
        content: `You are a research paper search assistant. Given a search query, find relevant research papers using web search. For each paper, return its title, authors, a brief abstract, and the best URL to access the full text (prefer direct PDF links from arXiv, PubMed Central, or open-access repositories).

Return your response as a JSON array with this exact format — no other text before or after:
[
  {
    "title": "Paper Title",
    "authors": ["Author One", "Author Two"],
    "abstract": "Brief description of the paper...",
    "url": "https://best-url-to-access-paper",
    "source": "where you found it (e.g. arXiv, PubMed, university site)"
  }
]

Rules:
- Find 5-10 relevant papers.
- For each paper, find the most direct link to the full text. Prefer PDF links (arXiv PDFs, open-access PDFs) over landing pages.
- If a paper is on arXiv, use the PDF link format: https://arxiv.org/pdf/XXXX.XXXXX
- Include real papers only. Do not make up papers or URLs.
- The abstract should be a real summary of the paper, not a placeholder.`,
      },
      {
        role: "user",
        content: `Find research papers about: ${query}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || "[]";

  // Extract JSON array from the response (may be wrapped in markdown fences)
  let jsonStr = content.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Try to find the JSON array in the response
  const arrayStart = jsonStr.indexOf("[");
  const arrayEnd = jsonStr.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd !== -1) {
    jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (p: any) =>
          typeof p.title === "string" &&
          p.title.trim() &&
          typeof p.url === "string" &&
          p.url.trim()
      )
      .map((p: any) => ({
        title: p.title.trim(),
        authors: Array.isArray(p.authors)
          ? p.authors.map((a: unknown) => String(a))
          : [],
        abstract: typeof p.abstract === "string" ? p.abstract.trim() : "",
        url: p.url.trim(),
        pdfUrl: p.url.trim(),
        source: typeof p.source === "string" ? p.source.trim() : "web",
      }));
  } catch {
    return [];
  }
}
