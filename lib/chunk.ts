/** Clean up raw PDF-extracted text before chunking */
function cleanText(text: string): string {
  let s = text;

  // Rejoin hyphenated words split across lines: "com-\n putational" → "computational"
  s = s.replace(/(\w)-\s+(\w)/g, "$1$2");

  // Remove citation annotations: [1], [2,3], [1-5], [1, 2, 3], (1), etc.
  s = s.replace(/\[\d+(?:[,;\s\-–]+\d+)*\]/g, "");

  // Remove parenthetical author-year citations: (Smith et al., 2020), (Smith, 2020; Jones, 2019)
  s = s.replace(/\([A-Z][a-z]+(?:\s+et\s+al\.?)?,?\s*\d{4}(?:\s*[;,]\s*[A-Z][a-z]+(?:\s+et\s+al\.?)?,?\s*\d{4})*\)/g, "");

  // Remove superscript-style annotations: common patterns like ¹ ² ³ or ∗ † ‡
  s = s.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰⁺⁻⁼⁽⁾]+/g, "");
  s = s.replace(/[∗†‡§¶‖]/g, "");

  // Normalize whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

// Abbreviations that end with a period but aren't sentence endings
const ABBREVIATIONS = new Set([
  "fig", "figs", "eq", "eqs", "ref", "refs", "sec", "secs",
  "tab", "vol", "no", "pp", "et al", "i.e", "e.g", "vs",
  "dr", "mr", "mrs", "ms", "prof", "jr", "sr", "inc", "corp",
  "dept", "univ", "approx", "est", "max", "min", "avg",
]);

/** Split text into sentences, respecting abbreviations and decimal numbers */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = "";

  // Walk character by character to find real sentence boundaries
  for (let i = 0; i < text.length; i++) {
    current += text[i];

    if (text[i] === "." || text[i] === "!" || text[i] === "?") {
      // Check if this is actually a sentence ending
      const nextChar = text[i + 1];
      const nextNextChar = text[i + 2];

      // Not end of text and next char isn't space/end → not sentence boundary
      // e.g. "3.14", "U.S.A"
      if (nextChar && nextChar !== " " && nextChar !== "\n") continue;

      // Decimal number: digit before and digit after (e.g. "3.14")
      if (i > 0 && /\d/.test(text[i - 1]) && nextNextChar && /\d/.test(nextNextChar)) continue;

      // Check if the word before the period is an abbreviation
      const beforePeriod = current.trimEnd();
      const lastWordMatch = beforePeriod.match(/(\S+)\.$/);
      if (lastWordMatch) {
        const lastWord = lastWordMatch[1].toLowerCase();
        if (ABBREVIATIONS.has(lastWord)) continue;
        // Single letter abbreviations: "A.", "B.", etc.
        if (lastWord.length === 1) continue;
      }

      // Next char must be space followed by uppercase, or end of text
      if (nextChar === " " && nextNextChar && /[a-z]/.test(nextNextChar)) continue;

      // This looks like a real sentence boundary
      const trimmed = current.trim();
      if (trimmed) sentences.push(trimmed);
      current = "";
    }
  }

  const remaining = current.trim();
  if (remaining) sentences.push(remaining);

  return sentences;
}

/** Split text into ~280-char chunks at sentence boundaries */
function splitIntoChunks(text: string): string[] {
  const cleaned = cleanText(text);
  if (!cleaned) return [];

  const sentences = splitIntoSentences(cleaned);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!sentence) continue;

    if (current && (current + " " + sentence).length > 280) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
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

  return chunks.filter((c) => c.length > 0);
}

export interface ChunkResult {
  content: string;
  imageIndex: number | null; // index into paper's images array, if this chunk references a figure
}

/**
 * Split paper text into tweet-sized chunks at sentence boundaries.
 * Cleans dehyphenation, strips annotations, and detects figure references.
 */
export function chunkPaperIntoTweets(
  _title: string,
  text: string
): ChunkResult[] {
  const rawChunks = splitIntoChunks(text);

  return rawChunks.map((content) => {
    // Detect figure references: "Figure 1", "Fig. 2", "figure 3"
    const figMatch = content.match(/(?:Figure|Fig\.?)\s*(\d+)/i);
    const imageIndex = figMatch ? parseInt(figMatch[1], 10) - 1 : null; // 0-indexed

    return { content, imageIndex };
  });
}
