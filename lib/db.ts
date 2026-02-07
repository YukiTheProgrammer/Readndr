import { neon } from "@neondatabase/serverless";

export function getDb() {
  return neon(process.env.DATABASE_URL!);
}

export async function initDb() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS papers (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      authors TEXT,
      source_url TEXT,
      raw_text TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tweets (
      id SERIAL PRIMARY KEY,
      paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      position INTEGER NOT NULL,
      parent_id INTEGER REFERENCES tweets(id) ON DELETE CASCADE
    )
  `;

  // Migration: add parent_id to existing tweets table if missing
  await sql`
    ALTER TABLE tweets ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES tweets(id) ON DELETE CASCADE
  `;

  // Drop old unique constraint if it exists (safe to ignore errors)
  try {
    await sql`ALTER TABLE tweets DROP CONSTRAINT IF EXISTS tweets_paper_id_position_key`;
  } catch {
    // constraint may not exist
  }

  // Partial unique indexes: parents unique by (paper_id, position), children by (parent_id, position)
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tweets_parent_position
    ON tweets (paper_id, position) WHERE parent_id IS NULL
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tweets_child_position
    ON tweets (parent_id, position) WHERE parent_id IS NOT NULL
  `;

  // Index on parent_id for fast child lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_tweets_parent_id ON tweets (parent_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS paper_images (
      id SERIAL PRIMARY KEY,
      paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
      image_index INTEGER NOT NULL,
      page_num INTEGER NOT NULL,
      data_url TEXT NOT NULL,
      UNIQUE(paper_id, image_index)
    )
  `;

  // Migration: add image_id to tweets
  await sql`
    ALTER TABLE tweets ADD COLUMN IF NOT EXISTS image_id INTEGER REFERENCES paper_images(id) ON DELETE SET NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      tweet_id INTEGER NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(account_id, tweet_id)
    )
  `;

  // Seed accounts
  await sql`INSERT INTO accounts (name) VALUES ('Nafizur') ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO accounts (name) VALUES ('Braden') ON CONFLICT (name) DO NOTHING`;
}
