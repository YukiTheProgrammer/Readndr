import { NextRequest } from "next/server";
import { extractTextFromPdf } from "@/lib/parse-pdf";
import { extractTextFromUrl } from "@/lib/parse-url";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const sql = getDb();

    let title: string;
    let text: string;
    let sourceUrl: string | null = null;
    let authorsJson: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return Response.json({ error: "No file provided" }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      text = await extractTextFromPdf(buffer);

      const firstLine = text
        .split("\n")
        .filter((line) => line.trim())[0]
        ?.trim();
      title = firstLine
        ? firstLine.slice(0, 100)
        : text.slice(0, 100).trim() || "Untitled Paper";
    } else {
      const body = await request.json();
      const { url, title: providedTitle, authors } = body;

      if (!url) {
        return Response.json({ error: "No URL provided" }, { status: 400 });
      }

      sourceUrl = url;
      const result = await extractTextFromUrl(url);
      text = result.text;
      title = providedTitle || result.title;
      authorsJson = authors ? JSON.stringify(authors) : null;
    }

    const [row] = await sql`
      INSERT INTO papers (title, authors, source_url, raw_text)
      VALUES (${title}, ${authorsJson}, ${sourceUrl}, ${text})
      RETURNING id
    `;
    const paperId = row.id;

    return Response.json({ paperId, title, text });
  } catch (error) {
    console.error("Parse error:", error);
    return Response.json(
      { error: "Failed to parse document" },
      { status: 500 }
    );
  }
}
