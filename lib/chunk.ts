/** Split text into ~280-char chunks at sentence boundaries */
function splitIntoChunks(text: string): string[] {
  // Normalize whitespace
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  // Split into sentences
  const sentences = cleaned.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g) || [
    cleaned,
  ];

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (current && (current + " " + trimmed).length > 280) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? current + " " + trimmed : trimmed;
    }

    // Force-split sentences that exceed 280 chars
    while (current.length > 280) {
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
 * Split paper text into tweet-sized chunks at sentence boundaries.
 * Pure mechanical split — no GPT call, no paraphrasing, no timeouts.
 */
export async function chunkPaperIntoTweets(
  _title: string,
  text: string
): Promise<string[]> {
  return splitIntoChunks(text);
}
