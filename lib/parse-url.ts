import { extractTextFromPdf } from "./parse-pdf";

export async function extractTextFromUrl(
  url: string
): Promise<{ text: string; title: string }> {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/pdf")) {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await extractTextFromPdf(buffer);
    const title = text.split("\n").filter((line) => line.trim())[0]?.trim() || url;
    return { text, title };
  }

  // HTML content
  const html = await response.text();

  // Extract title from <title> tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  // Strip all HTML tags
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { text, title };
}
