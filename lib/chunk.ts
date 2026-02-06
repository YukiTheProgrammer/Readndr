import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chunkPaperIntoTweets(
  title: string,
  text: string
): Promise<string[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You break research papers into tweet-sized chunks. Preserve information density — do NOT summarize or simplify. Every detail, data point, method, and finding matters. The full thread should reconstruct the paper's content faithfully.",
      },
      {
        role: "user",
        content: `Break this research paper into a thread of tweet-sized chunks (max 280 characters each).

Rules:
- DO NOT summarize. Chunk the paper's actual content into atomic, dense tweets.
- Preserve all key information: methods, data, results, numbers, terminology.
- Each tweet should be one atomic idea or fact — self-contained but dense.
- Follow the paper's structure: intro → methods → results → discussion → conclusion.
- Use the paper's own terminology. Do not dumb down or paraphrase loosely.
- DO NOT number tweets (no "1/n", "2/n", etc.) — numbering is handled externally.
- Use as many tweets as needed to capture everything. More tweets > lost information.

Paper title: ${title}

Paper content:
${text.slice(0, 15000)}

Return ONLY a JSON array of strings, each string being one tweet. No other text.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || "[]";

  try {
    const tweets = JSON.parse(content);
    if (Array.isArray(tweets)) {
      return tweets.map((t: unknown) => String(t));
    }
  } catch {
    // If parsing fails, split by newlines and filter
    return content
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
  }

  return [];
}
