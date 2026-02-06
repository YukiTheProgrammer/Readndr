# Readndr

Mobile-first doomscrolling webapp for reading research papers as tweet-sized chunks.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS 4** with custom theme tokens in `globals.css`
- **Neon Postgres** via `@neondatabase/serverless` (deployed on Vercel)
- **OpenAI GPT** (`gpt-4o-mini`) for paper-to-tweets chunking
- **framer-motion** for Tinder-style swipe cards
- **pdf-parse** v2 (class-based API) for PDF text extraction

## Commands

- `npm run dev` — start dev server with Turbopack
- `npm run build` — production build
- `npm run lint` — ESLint

## Environment

Requires `.env.local` with:
```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...  # Neon connection string
```

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add a Neon Postgres database from Vercel Marketplace (auto-sets `DATABASE_URL`)
4. Add `OPENAI_API_KEY` in Vercel environment variables
5. Deploy — then hit `/api/init` once to create tables and seed accounts

## Design System

### Colors (Tailwind tokens)
| Token | Hex | Usage |
|-------|-----|-------|
| `forest` | `#40513B` | Primary — nav, headers, buttons, text |
| `forest-light` | `#546B4D` | Borders |
| `light-gray` | `#D9D9D9` | Page backgrounds |
| `cream` | `#E5D9B6` | Cards, inputs, secondary surfaces |
| `cream-dark` | `#D4C89E` | Borders, dividers |
| `orange` | `#E67E22` | Accent — CTAs, bookmarks, active states |
| `orange-light` | `#F39C12` | Hover accent |

### Fonts
- `font-bodoni` — Libre Bodoni (Google Fonts) for headings
- `font-avenir` — Nunito (Google Fonts) for body text

Both configured as `--font-*` CSS custom properties in `app/globals.css` `@theme` block.

## Architecture

### Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Account selection (Nafizur / Braden) — no NavBar |
| `/search` | `app/(main)/search/page.tsx` | Search input, PDF upload, URL paste |
| `/results` | `app/(main)/results/page.tsx` | Tinder-style swipe cards of search results |
| `/read` | `app/(main)/read/page.tsx` | Twitter-esque tweet feed of chunked paper |
| `/bookmarks` | `app/(main)/bookmarks/page.tsx` | Per-account saved bookmarked tweets |

The `(main)` route group (`app/(main)/layout.tsx`) wraps all pages except `/` with the bottom NavBar and `pb-20` padding.

### API Routes

| Route | File | Method | Description |
|-------|------|--------|-------------|
| `/api/search` | `app/api/search/route.ts` | GET | Aggregate search across 4 APIs |
| `/api/parse` | `app/api/parse/route.ts` | POST | PDF upload or URL → extract text, save paper |
| `/api/chunk` | `app/api/chunk/route.ts` | POST | Send text to OpenAI → tweet chunks, save to DB |
| `/api/papers` | `app/api/papers/route.ts` | GET | Retrieve paper + tweets by ID |
| `/api/bookmarks` | `app/api/bookmarks/route.ts` | GET/POST/DELETE | Per-account bookmark CRUD |

### Components

| Component | File | Description |
|-----------|------|-------------|
| `NavBar` | `components/NavBar.tsx` | Fixed bottom nav (Home, Search, Bookmarks) |
| `SwipeCard` | `components/SwipeCard.tsx` | Single draggable Tinder card with framer-motion |
| `SwipeStack` | `components/SwipeStack.tsx` | Card stack manager with AnimatePresence |
| `Tweet` | `components/Tweet.tsx` | Single tweet card with bookmark button |
| `TweetFeed` | `components/TweetFeed.tsx` | Scrollable list of Tweet components |

### Lib Modules

| Module | File | Description |
|--------|------|-------------|
| `db` | `lib/db.ts` | Neon Postgres connection, table creation, account seeding |
| `account` | `lib/account.ts` | Read account ID from cookie |
| `search` | `lib/search.ts` | Aggregate search: Semantic Scholar, OpenAlex, arXiv, CrossRef |
| `parse-pdf` | `lib/parse-pdf.ts` | PDF text extraction via `PDFParse` class |
| `parse-url` | `lib/parse-url.ts` | URL fetch → text extraction (HTML or PDF) |
| `chunk` | `lib/chunk.ts` | OpenAI GPT call to break text into tweets |

## Database Schema

4 tables in Neon Postgres (init via `GET /api/init`):

- **accounts** — `id`, `name` (seeded: Nafizur=1, Braden=2)
- **papers** — `id`, `title`, `authors` (JSON), `source_url`, `raw_text`, `created_at`
- **tweets** — `id`, `paper_id` (FK), `content`, `position` (unique per paper)
- **bookmarks** — `id`, `account_id` (FK), `tweet_id` (FK), `created_at` (unique pair)

## Data Flow

1. User selects account → cookie `readndr_account_id` set
2. Search query → `/api/search` → parallel requests to 4 APIs → normalized + deduplicated results
3. Swipe right on card → `/api/parse` (fetch paper text) → save to `papers` table
4. Navigate to `/read?paperId=X` → `/api/papers` checks for tweets → if none, calls `/api/chunk` → OpenAI generates tweets → saved to `tweets` table
5. Bookmark toggle → `POST/DELETE /api/bookmarks`

## Key Gotchas

- `pdf-parse` v2+ uses **named export** `PDFParse` class, NOT default import. Correct: `import { PDFParse } from "pdf-parse"` then `new PDFParse({ data: new Uint8Array(buffer) })`
- Database uses `@neondatabase/serverless` with `neon()` tagged template — all queries are async
- Hit `GET /api/init` once after deployment to create tables and seed accounts
- npm name must be lowercase even if folder is "Readndr"
- `@import url(...)` for Google Fonts must come BEFORE `@import "tailwindcss"` in CSS
- The `raw_text` column stores full paper text for deferred chunking (text isn't sent back from papers API once tweets exist)
- Search uses `Promise.allSettled` so individual API failures don't break results
- Each API fetch has a 10-second timeout via `AbortController`
