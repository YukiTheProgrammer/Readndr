import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Strip JSON artifacts that leak from GPT output into tweet content */
function cleanTweetContent(raw: string): string {
  let s = raw;
  s = s.replace(/\\"/g, '"');
  s = s.replace(/^["']+|["']+$/g, "");
  s = s.replace(/&quot;/g, '"');
  s = s.replace(/&amp;/g, "&");
  s = s.replace(/&lt;/g, "<");
  s = s.replace(/&gt;/g, ">");
  s = s.replace(/&#39;/g, "'");
  s = s.replace(/^```json\s*/i, "");
  s = s.replace(/\s*```$/i, "");
  return s.trim();
}

/** Split text into rough ~280-char chunks at sentence boundaries */
function splitIntoRawChunks(text: string): string[] {
  // Normalize whitespace
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  // Split into sentences (period/question/exclamation followed by space + capital, or end of string)
  const sentences = cleaned.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g) || [
    cleaned,
  ];

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // If adding this sentence would exceed ~280 chars, flush current chunk
    if (current && (current + " " + trimmed).length > 280) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? current + " " + trimmed : trimmed;
    }

    // If a single sentence exceeds 280, force-split it
    while (current.length > 280) {
      // Try to break at a comma or space near the limit
      let breakAt = current.lastIndexOf(", ", 280);
      if (breakAt < 100) breakAt = current.lastIndexOf(" ", 280);
      if (breakAt < 50) breakAt = 280;
      chunks.push(current.slice(0, breakAt).trim());
      current = current.slice(breakAt).trim();
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Split paper text into tweet-sized chunks, then use GPT to lightly clean
 * up chunk boundaries so each tweet reads naturally. No paraphrasing.
 */
export async function chunkPaperIntoTweets(
  title: string,
  text: string
): Promise<string[]> {
  const rawChunks = splitIntoRawChunks(text);
  if (rawChunks.length === 0) return [];

  // Send raw chunks to GPT for light boundary cleanup
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 16000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You clean up tweet-chunk boundaries from a research paper. You receive an array of text chunks that were mechanically split. Your ONLY job is to adjust boundaries so each chunk reads as a complete thought. Rules: DO NOT paraphrase, summarize, or change wording. DO NOT remove any content. DO NOT add commentary. Just move sentence fragments to the right chunk if a split landed mid-sentence. Keep every chunk under 280 characters. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Here are ${rawChunks.length} mechanically-split chunks from the paper "${title}". Clean up the boundaries so each reads naturally. Do not change wording or remove content.

${JSON.stringify({ chunks: rawChunks })}

Return JSON: { "tweets": ["chunk1", "chunk2", ...] }`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(content);
    if (parsed.tweets && Array.isArray(parsed.tweets)) {
      return parsed.tweets
        .map((t: unknown) => cleanTweetContent(String(t)))
        .filter((t: string) => t.length > 0);
    }
  } catch {
    // If GPT cleanup fails, fall back to raw chunks
  }

  return rawChunks;
}
