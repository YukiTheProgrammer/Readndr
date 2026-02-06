import { NextRequest } from "next/server";
import { chunkPaperHierarchy } from "@/lib/chunk";
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

    const { chunks } = await chunkPaperHierarchy(title, text);
    const sql = getDb();

    // Insert parent tweets, then their children
    for (let pi = 0; pi < chunks.length; pi++) {
      const chunk = chunks[pi];

      // Insert parent tweet and capture its id
      const [parent] = await sql`
        INSERT INTO tweets (paper_id, content, position, parent_id)
        VALUES (${paperId}, ${chunk.summary}, ${pi}, ${null})
        ON CONFLICT DO NOTHING
        RETURNING id
      `;

      if (!parent) continue;
      const parentId = parent.id;

      // Insert child detail tweets
      for (let ci = 0; ci < chunk.details.length; ci++) {
        await sql`
          INSERT INTO tweets (paper_id, content, position, parent_id)
          VALUES (${paperId}, ${chunk.details[ci]}, ${ci}, ${parentId})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Retrieve all saved tweets
    const savedTweets = await sql`
      SELECT id, content, position, parent_id
      FROM tweets
      WHERE paper_id = ${paperId}
      ORDER BY
        CASE WHEN parent_id IS NULL THEN position ELSE (
          SELECT position FROM tweets t2 WHERE t2.id = tweets.parent_id
        ) END,
        parent_id IS NOT NULL,
        position
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
