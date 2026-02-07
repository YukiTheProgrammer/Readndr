export interface PaperResult {
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  pdfUrl: string | null;
  source: "semantic_scholar" | "openalex" | "arxiv" | "crossref";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch with a 10-second timeout via AbortController. */
async function fetchWithTimeout(
  url: string,
  opts?: RequestInit,
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Strip HTML tags from a string. */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Reconstruct plain text from an OpenAlex abstract_inverted_index.
 *
 * The inverted index maps each word to an array of positional indices,
 * e.g. { "We": [0, 5], "study": [1] }. We reverse it into ordered text.
 */
function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null | undefined
): string {
  if (!invertedIndex) return "";
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, w]) => w).join(" ");
}

// ---------------------------------------------------------------------------
// Per-source search functions
// ---------------------------------------------------------------------------

async function searchSemanticScholar(query: string): Promise<PaperResult[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,authors,abstract,url,openAccessPdf&limit=10`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Semantic Scholar responded ${res.status}`);

  const data = await res.json();
  const items: unknown[] = data?.data ?? [];

  return items.map((item: any) => ({
    title: item.title ?? "",
    authors: (item.authors ?? []).map((a: any) => a.name as string),
    abstract: item.abstract ?? "",
    url: item.url ?? "",
    pdfUrl: item.openAccessPdf?.url ?? null,
    source: "semantic_scholar" as const,
  }));
}

async function searchOpenAlex(query: string): Promise<PaperResult[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=10&mailto=readndr@example.com`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`OpenAlex responded ${res.status}`);

  const data = await res.json();
  const items: unknown[] = data?.results ?? [];

  return items.map((item: any) => ({
    title: item.display_name ?? "",
    authors: (item.authorships ?? []).map(
      (a: any) => a.author?.display_name as string
    ),
    abstract: reconstructAbstract(item.abstract_inverted_index),
    url: item.doi ?? item.id ?? "",
    pdfUrl: item.open_access?.oa_url ?? null,
    source: "openalex" as const,
  }));
}

async function searchArxiv(query: string): Promise<PaperResult[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=10`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`arXiv responded ${res.status}`);

  const xml = await res.text();

  // Extract all <entry>...</entry> blocks
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const results: PaperResult[] = [];
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(/\s+/g, " ").trim()
      : "";

    const authorNames: string[] = [];
    const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
    let authorMatch: RegExpExecArray | null;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authorNames.push(authorMatch[1].trim());
    }

    const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
    const abstract = summaryMatch
      ? summaryMatch[1].replace(/\s+/g, " ").trim()
      : "";

    const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
    const entryUrl = idMatch ? idMatch[1].trim() : "";

    const pdfLinkMatch = entry.match(
      /<link[^>]*title="pdf"[^>]*href="([^"]*)"[^>]*\/?>/
    );
    const pdfUrl = pdfLinkMatch ? pdfLinkMatch[1] : null;

    results.push({
      title,
      authors: authorNames,
      abstract,
      url: entryUrl,
      pdfUrl,
      source: "arxiv" as const,
    });
  }

  return results;
}

async function searchCrossRef(query: string): Promise<PaperResult[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=10`;
  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "Readndr/0.1.0 (mailto:readndr@example.com)",
    },
  });
  if (!res.ok) throw new Error(`CrossRef responded ${res.status}`);

  const data = await res.json();
  const items: unknown[] = data?.message?.items ?? [];

  return items.map((item: any) => {
    const authors: string[] = (item.author ?? []).map((a: any) => {
      const given = a.given ?? "";
      const family = a.family ?? "";
      return `${given} ${family}`.trim();
    });

    const rawAbstract: string = item.abstract ?? "";
    const abstract = stripHtmlTags(rawAbstract);

    // Look for a PDF link in the link array
    const pdfLink = (item.link ?? []).find(
      (l: any) =>
        l["content-type"] === "application/pdf" ||
        l["content-type"] === "unspecified"
    );
    const pdfUrl: string | null = pdfLink?.URL ?? null;

    return {
      title: (item.title ?? [""])[0] ?? "",
      authors,
      abstract,
      url: item.URL ?? "",
      pdfUrl,
      source: "crossref" as const,
    };
  });
}

// ---------------------------------------------------------------------------
// Main aggregator
// ---------------------------------------------------------------------------

export async function searchPapers(query: string): Promise<PaperResult[]> {
  const settled = await Promise.allSettled([
    searchSemanticScholar(query),
    searchOpenAlex(query),
    searchArxiv(query),
    searchCrossRef(query),
  ]);

  const allResults: PaperResult[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      allResults.push(...result.value);
    }
    // Rejected promises are silently ignored — the other sources still contribute.
  }

  // Deduplicate by normalized title — prefer entries that have a pdfUrl
  const byTitle = new Map<string, PaperResult>();
  for (const paper of allResults) {
    const key = paper.title.toLowerCase().trim();
    if (!key) continue;
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, paper);
    } else if (!existing.pdfUrl && paper.pdfUrl) {
      // Upgrade: replace entry that lacks a PDF with one that has it
      byTitle.set(key, paper);
    }
  }

  // Only return papers that have an open-access PDF URL
  return Array.from(byTitle.values()).filter((p) => p.pdfUrl);
}
