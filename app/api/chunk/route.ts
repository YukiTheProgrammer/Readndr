import { NextRequest } from "next/server";
import { chunkPaperIntoTweets } from "@/lib/chunk";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { paperId, text, title } = await request.json();

    if (!paperId || !text || !title) {
      return Response.json(
        { error: "Missing required fields: paperId, text, title" },
        { status: 400 }
      );
    }

    const tweets = await chunkPaperIntoTweets(title, text);
    const sql = getDb();

    // Insert tweets one by one (Neon doesn't support transactions via tagged template)
    for (let i = 0; i < tweets.length; i++) {
      await sql`
        INSERT INTO tweets (paper_id, content, position)
        VALUES (${paperId}, ${tweets[i]}, ${i})
        ON CONFLICT (paper_id, position) DO NOTHING
      `;
    }

    // Retrieve saved tweets with their IDs
    const savedTweets = await sql`
      SELECT id, content, position
      FROM tweets
      WHERE paper_id = ${paperId}
      ORDER BY position
    `;

    return Response.json({ tweets: savedTweets });
  } catch (error) {
    console.error("Chunk error:", error);
    return Response.json(
      { error: "Failed to chunk paper" },
      { status: 500 }
    );
  }
}
