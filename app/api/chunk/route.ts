import { NextRequest } from "next/server";
import { chunkPaperIntoTweets } from "@/lib/chunk";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

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

    for (let i = 0; i < tweets.length; i++) {
      await sql`
        INSERT INTO tweets (paper_id, content, position, parent_id)
        VALUES (${paperId}, ${tweets[i]}, ${i}, ${null})
        ON CONFLICT DO NOTHING
      `;
    }

    const savedTweets = await sql`
      SELECT id, content, position, parent_id
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
