import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Strip JSON artifacts that leak from GPT output into tweet content */
function cleanTweetContent(raw: string): string {
  let s = raw;
  // Remove escaped quotes
  s = s.replace(/\\"/g, '"');
  // Remove wrapping quotes (e.g. "\"content\"" → content)
  s = s.replace(/^["']+|["']+$/g, "");
  // Remove HTML entities
  s = s.replace(/&quot;/g, '"');
  s = s.replace(/&amp;/g, "&");
  s = s.replace(/&lt;/g, "<");
  s = s.replace(/&gt;/g, ">");
  s = s.replace(/&#39;/g, "'");
  // Remove markdown JSON fences
  s = s.replace(/^```json\s*/i, "");
  s = s.replace(/\s*```$/i, "");
  return s.trim();
}

export interface HierarchyChunk {
  summary: string;
  details: string[];
}

export interface HierarchyResult {
  chunks: HierarchyChunk[];
}

export async function chunkPaperHierarchy(
  title: string,
  text: string
): Promise<HierarchyResult> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You break research papers into a 2-level hierarchy of tweet-sized chunks. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Break this research paper into a hierarchical thread of tweet-sized chunks.

Structure:
- 5-8 PARENT tweets: each is a topic summary (max 280 chars) covering a major section/theme of the paper
- Each parent has 3-5 DETAIL tweets: dense, information-preserving chunks (max 280 chars each) that expand on that topic

Rules:
- DO NOT summarize loosely. Detail tweets must preserve all key information: methods, data, results, numbers, terminology.
- Parent tweets should be clear topic overviews that make sense standalone.
- Detail tweets should contain the dense factual content under each topic.
- Follow the paper's structure: intro → methods → results → discussion → conclusion.
- Use the paper's own terminology. Do not dumb down or paraphrase loosely.
- DO NOT number tweets — numbering is handled externally.
- DO NOT include quotes around tweet content.

Paper title: ${title}

Paper content:
${text.slice(0, 15000)}

Return JSON in exactly this format:
{
  "chunks": [
    {
      "summary": "Parent tweet text here",
      "details": ["Detail tweet 1", "Detail tweet 2", "Detail tweet 3"]
    }
  ]
}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(content);
    if (parsed.chunks && Array.isArray(parsed.chunks)) {
      return {
        chunks: parsed.chunks
          .filter(
            (c: { summary?: unknown; details?: unknown }) =>
              typeof c.summary === "string" && Array.isArray(c.details)
          )
          .map((c: { summary: string; details: unknown[] }) => ({
            summary: cleanTweetContent(c.summary),
            details: c.details
              .map((d: unknown) => cleanTweetContent(String(d)))
              .filter((d: string) => d.length > 0),
          })),
      };
    }
  } catch {
    // Parse failure — return empty
  }

  return { chunks: [] };
}
