import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return Response.json(
      { error: "Missing accountId parameter" },
      { status: 400 }
    );
  }

  const sql = getDb();
  const id = parseInt(accountId, 10);

  const bookmarks = await sql`
    SELECT b.id, b.tweet_id, b.created_at,
           t.content, t.position, t.paper_id, t.parent_id,
           p.title as paper_title,
           pt.content as parent_content
    FROM bookmarks b
    JOIN tweets t ON t.id = b.tweet_id
    JOIN papers p ON p.id = t.paper_id
    LEFT JOIN tweets pt ON pt.id = t.parent_id
    WHERE b.account_id = ${id}
    ORDER BY b.created_at DESC
  `;

  return Response.json({ bookmarks });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { accountId, tweetId } = body;

  if (!accountId || !tweetId) {
    return Response.json(
      { error: "Missing accountId or tweetId" },
      { status: 400 }
    );
  }

  try {
    const sql = getDb();
    await sql`
      INSERT INTO bookmarks (account_id, tweet_id)
      VALUES (${accountId}, ${tweetId})
      ON CONFLICT (account_id, tweet_id) DO NOTHING
    `;
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to add bookmark" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const { accountId, tweetId } = body;

  if (!accountId || !tweetId) {
    return Response.json(
      { error: "Missing accountId or tweetId" },
      { status: 400 }
    );
  }

  const sql = getDb();
  await sql`
    DELETE FROM bookmarks
    WHERE account_id = ${accountId} AND tweet_id = ${tweetId}
  `;

  return Response.json({ success: true });
}
