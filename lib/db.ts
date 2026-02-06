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
      UNIQUE(paper_id, position)
    )
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
