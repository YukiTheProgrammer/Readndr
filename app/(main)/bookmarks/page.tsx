"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BookmarkEntry {
  id: number;
  tweet_id: number;
  content: string;
  position: number;
  paper_id: number;
  paper_title: string;
  created_at: string;
}

function getAccountId(): number | null {
  const match = document.cookie.match(/readndr_account_id=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookmarks() {
      const accountId = getAccountId();
      if (!accountId) {
        router.push("/");
        return;
      }

      try {
        const res = await fetch(`/api/bookmarks?accountId=${accountId}`);
        if (res.ok) {
          const data = await res.json();
          setBookmarks(data.bookmarks);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchBookmarks();
  }, [router]);

  async function removeBookmark(tweetId: number) {
    const accountId = getAccountId();
    if (!accountId) return;

    setBookmarks((prev) => prev.filter((b) => b.tweet_id !== tweetId));

    await fetch("/api/bookmarks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, tweetId }),
    });
  }

  // Group bookmarks by paper
  const grouped = bookmarks.reduce(
    (acc, bm) => {
      if (!acc[bm.paper_id]) {
        acc[bm.paper_id] = { title: bm.paper_title, items: [] };
      }
      acc[bm.paper_id].items.push(bm);
      return acc;
    },
    {} as Record<number, { title: string; items: BookmarkEntry[] }>
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-forest/20 border-t-orange" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-cream-dark/50 bg-cream px-4 py-4">
        <h1 className="font-bodoni text-2xl font-bold text-forest">
          Bookmarks
        </h1>
      </div>

      {bookmarks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <svg
            className="h-12 w-12 text-forest/20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <p className="font-bodoni text-lg text-forest/60">
            No bookmarks yet
          </p>
          <p className="font-avenir text-sm text-forest/40">
            Bookmark tweets while reading to save them here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {Object.entries(grouped).map(([paperId, group]) => (
            <div key={paperId} className="border-b border-light-gray">
              {/* Paper header */}
              <button
                onClick={() => router.push(`/read?paperId=${paperId}`)}
                className="w-full bg-forest/5 px-4 py-3 text-left transition-colors hover:bg-forest/10"
              >
                <p className="font-bodoni text-sm font-semibold text-forest">
                  {group.title}
                </p>
                <p className="font-avenir text-xs text-forest/50">
                  {group.items.length} saved tweet
                  {group.items.length !== 1 ? "s" : ""} &middot; Tap to read
                  full paper
                </p>
              </button>

              {/* Bookmarked tweets */}
              {group.items.map((bm) => (
                <div
                  key={bm.tweet_id}
                  className="flex gap-3 border-t border-cream-dark/30 bg-cream p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 font-avenir text-xs text-forest/40">
                      Tweet {bm.position + 1}
                    </p>
                    <p className="whitespace-pre-wrap font-avenir text-[15px] leading-relaxed text-forest">
                      {bm.content}
                    </p>
                  </div>
                  <button
                    onClick={() => removeBookmark(bm.tweet_id)}
                    className="shrink-0 self-start rounded-full p-2 text-orange transition-colors hover:bg-orange/10"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
