"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import TweetFeed from "@/components/TweetFeed";

interface TweetData {
  id: number;
  content: string;
  position: number;
  image_url?: string | null;
}

function getAccountId(): number | null {
  const match = document.cookie.match(/readndr_account_id=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function ReadContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paperId = searchParams.get("paperId");

  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [paperTitle, setPaperTitle] = useState("");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [chunking, setChunking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaper = useCallback(async () => {
    if (!paperId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch paper and its tweets
      const res = await fetch(`/api/papers?id=${paperId}`);
      if (!res.ok) throw new Error("Failed to load paper");
      const data = await res.json();

      setPaperTitle(data.paper.title);

      if (data.tweets && data.tweets.length > 0) {
        setTweets(data.tweets);
      } else if (!data.text) {
        throw new Error(
          "No text available for this paper. It may have failed to download. Try adding it again from search."
        );
      } else {
        // Need to chunk the paper first
        setChunking(true);
        const chunkRes = await fetch("/api/chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paperId: parseInt(paperId),
            text: data.text,
            title: data.paper.title,
          }),
        });
        if (!chunkRes.ok) {
          const errData = await chunkRes.json().catch(() => ({}));
          throw new Error(
            errData.error || "Failed to process paper"
          );
        }
        const chunkData = await chunkRes.json();
        setTweets(chunkData.tweets);
        setChunking(false);
      }

      // Fetch bookmarks for current account
      const accountId = getAccountId();
      if (accountId) {
        const bmRes = await fetch(`/api/bookmarks?accountId=${accountId}`);
        if (bmRes.ok) {
          const bmData = await bmRes.json();
          const ids = new Set<number>(
            bmData.bookmarks.map((b: { tweet_id: number }) => b.tweet_id)
          );
          setBookmarkedIds(ids);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setChunking(false);
    }
  }, [paperId]);

  useEffect(() => {
    fetchPaper();
  }, [fetchPaper]);

  async function toggleBookmark(tweetId: number) {
    const accountId = getAccountId();
    if (!accountId) {
      router.push("/");
      return;
    }

    const isBookmarked = bookmarkedIds.has(tweetId);

    // Optimistic update
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isBookmarked) {
        next.delete(tweetId);
      } else {
        next.add(tweetId);
      }
      return next;
    });

    try {
      await fetch("/api/bookmarks", {
        method: isBookmarked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, tweetId }),
      });
    } catch {
      // Revert on error
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isBookmarked) {
          next.add(tweetId);
        } else {
          next.delete(tweetId);
        }
        return next;
      });
    }
  }

  if (!paperId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <p className="font-avenir text-forest/60">
          No paper selected.{" "}
          <button
            onClick={() => router.push("/search")}
            className="text-orange underline"
          >
            Go back to search
          </button>
        </p>
      </div>
    );
  }

  if (loading || chunking) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-forest/20 border-t-orange" />
        <p className="font-avenir text-sm text-forest/60">
          {chunking
            ? "Breaking paper into tweets..."
            : "Loading paper..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="font-avenir text-sm text-red-600">{error}</p>
        <button
          onClick={fetchPaper}
          className="rounded-lg bg-orange px-4 py-2 font-avenir text-sm text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Paper header */}
      <div className="border-b border-cream-dark/50 bg-cream px-4 py-3">
        <h1 className="line-clamp-2 font-bodoni text-lg font-bold text-forest">
          {paperTitle}
        </h1>
        <p className="mt-1 font-avenir text-xs text-forest/50">
          {tweets.length} tweets
        </p>
      </div>

      {/* Tweet feed */}
      <div className="flex-1 overflow-y-auto">
        <TweetFeed
          tweets={tweets}
          paperTitle={paperTitle}
          bookmarkedIds={bookmarkedIds}
          onToggleBookmark={toggleBookmark}
        />
      </div>
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-forest/20 border-t-orange" />
        </div>
      }
    >
      <ReadContent />
    </Suspense>
  );
}
