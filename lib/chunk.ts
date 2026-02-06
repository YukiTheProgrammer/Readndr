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
    max_tokens: 16000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a research paper decomposition engine. Your job is to convert a full paper into a comprehensive, exhaustive 2-level hierarchy of tweet-sized chunks that together form a COMPLETE representation of the paper. Nothing should be left out. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Decompose this entire research paper into a 2-level hierarchy of tweet-sized chunks. The full set of tweets must be a DIRECT, FAITHFUL representation of the paper — every method, result, data point, argument, limitation, and conclusion must appear somewhere.

Structure:
- PARENT tweets: one per major section or theme (typically 8-15+ parents). Each is a concise topic header (max 280 chars) that names the section and its key takeaway.
- DETAIL tweets under each parent: as many as needed (typically 5-15 per parent) to capture ALL content in that section. Each detail tweet is one atomic fact, method step, result, data point, or argument (max 280 chars).

Critical rules:
- EXHAUSTIVE COVERAGE: If information appears in the paper, it MUST appear in a tweet. Do not skip paragraphs, figures, tables, equations, citations, or minor results. When in doubt, include it.
- ATOMIC TWEETS: Each detail tweet states exactly one fact, finding, number, method step, or argument. Break complex sentences into multiple tweets.
- NO SUMMARIZING: Do not compress 3 findings into 1 tweet. Give each finding its own tweet. Do not say "several factors" — list each factor in its own tweet.
- PRESERVE SPECIFICS: Keep exact numbers, p-values, confidence intervals, sample sizes, effect sizes, percentages, model names, dataset names, and all quantitative details.
- USE PAPER'S LANGUAGE: Use the paper's exact terminology, abbreviations, and phrasing. Do not paraphrase into simpler language.
- FOLLOW PAPER ORDER: intro → background → methods → experimental setup → results → analysis → discussion → limitations → conclusion → future work.
- DO NOT number tweets — numbering is handled externally.
- DO NOT wrap tweet text in quotes.
- Aim for 50-100+ total tweets. More tweets is always better than lost information.

Paper title: ${title}

Paper content:
${text.slice(0, 40000)}

Return JSON in exactly this format:
{
  "chunks": [
    {
      "summary": "Parent tweet text here",
      "details": ["Detail tweet 1", "Detail tweet 2", "Detail tweet 3", ...]
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
