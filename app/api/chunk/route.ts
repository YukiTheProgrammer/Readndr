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

    const chunks = chunkPaperIntoTweets(title, text);
    const sql = getDb();

    // Fetch paper images to match figure references
    const paperImages = await sql`
      SELECT id, image_index FROM paper_images
      WHERE paper_id = ${paperId}
      ORDER BY image_index
    `;
    const imageMap = new Map<number, number>();
    for (const img of paperImages) {
      imageMap.set(img.image_index, img.id);
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const imageId =
        chunk.imageIndex !== null ? (imageMap.get(chunk.imageIndex) ?? null) : null;

      await sql`
        INSERT INTO tweets (paper_id, content, position, parent_id, image_id)
        VALUES (${paperId}, ${chunk.content}, ${i}, ${null}, ${imageId})
        ON CONFLICT DO NOTHING
      `;
    }

    const savedTweets = await sql`
      SELECT t.id, t.content, t.position, t.image_id,
             pi.data_url as image_url
      FROM tweets t
      LEFT JOIN paper_images pi ON pi.id = t.image_id
      WHERE t.paper_id = ${paperId}
      ORDER BY t.position
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
