import { extractTextFromPdf, type ExtractedImage } from "./parse-pdf";

export async function extractTextFromUrl(
  url: string
): Promise<{ text: string; title: string; images: ExtractedImage[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("certificate")) {
      throw new Error(`SSL certificate error fetching URL. Try a different source.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/pdf")) {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { text, images } = await extractTextFromPdf(buffer);
    const title = text.split("\n").filter((line) => line.trim())[0]?.trim() || url;
    return { text, title, images };
  }

  // HTML content — no images to extract
  const html = await response.text();

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { text, title, images: [] };
}
