import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Missing paper id" }, { status: 400 });
    }

    const paperId = parseInt(id, 10);
    if (isNaN(paperId)) {
      return Response.json({ error: "Invalid paper id" }, { status: 400 });
    }
    const sql = getDb();

    const [paper] = await sql`
      SELECT id, title, authors, source_url, created_at
      FROM papers WHERE id = ${paperId}
    `;

    if (!paper) {
      return Response.json({ error: "Paper not found" }, { status: 404 });
    }

    const tweets = await sql`
      SELECT id, content, position
      FROM tweets
      WHERE paper_id = ${paperId}
      ORDER BY position
    `;

    // Only include raw_text if no tweets exist yet (needed for chunking)
    let text: string | undefined;
    if (tweets.length === 0) {
      const [raw] = await sql`
        SELECT raw_text FROM papers WHERE id = ${paperId}
      `;
      text = raw?.raw_text || undefined;
    }

    return Response.json({ paper, tweets, text });
  } catch (error) {
    console.error("Papers error:", error);
    return Response.json(
      { error: "Failed to fetch paper" },
      { status: 500 }
    );
  }
}
