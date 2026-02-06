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
          "You are a research paper summarizer. You break papers into tweet-sized posts.",
      },
      {
        role: "user",
        content: `Break the following research paper into a series of tweet-sized posts (max 280 characters each) that capture the key ideas, findings, and insights.

Rules:
- Each tweet should be self-contained and readable on its own
- Follow a logical narrative from introduction to conclusion
- Use plain language, avoid excessive jargon
- Include key data points and findings
- Number each tweet (1/n, 2/n, etc.)
- Aim for 15-30 tweets depending on paper length

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
