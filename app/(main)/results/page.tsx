"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import SwipeStack from "@/components/SwipeStack";
import type { PaperCardData } from "@/components/SwipeCard";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const [papers, setPapers] = useState<PaperCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;

    async function fetchResults() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setPapers(data.results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [query]);

  async function handleSelect(card: PaperCardData) {
    const url = card.pdfUrl ?? card.url;
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title: card.title, authors: card.authors }),
      });
      if (!res.ok) throw new Error("Failed to parse paper");
      const data = await res.json();
      router.push(`/read?paperId=${data.paperId}`);
    } catch {
      alert("Failed to load paper. Try another one.");
    }
  }

  if (!query) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <p className="font-avenir text-forest/60">
          No search query provided.{" "}
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

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-6">
      <h1 className="mb-1 font-bodoni text-2xl font-bold text-forest">
        Results
      </h1>
      <p className="mb-6 font-avenir text-sm text-forest/60">
        &ldquo;{query}&rdquo; &middot; Swipe to browse
      </p>

      {loading && (
        <div className="flex h-[480px] w-full max-w-[340px] items-center justify-center rounded-2xl bg-cream/50">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-forest/20 border-t-orange" />
            <p className="font-avenir text-sm text-forest/60">
              Searching papers...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="w-full max-w-[340px] rounded-2xl bg-red-50 p-6 text-center">
          <p className="font-avenir text-sm text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 font-avenir text-sm text-orange underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && papers.length === 0 && (
        <div className="flex h-[480px] w-full max-w-[340px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cream-dark p-8 text-center">
          <p className="mb-2 font-bodoni text-xl text-forest">
            No results found
          </p>
          <p className="font-avenir text-sm text-forest/60">
            Try a different search query
          </p>
        </div>
      )}

      {!loading && !error && papers.length > 0 && (
        <SwipeStack cards={papers} onSelect={handleSelect} />
      )}

      {/* Desktop action buttons */}
      <div className="mt-6 hidden gap-6 sm:flex">
        <button
          onClick={() => {
            const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
            window.dispatchEvent(event);
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-cream shadow-md transition-transform hover:scale-110 active:scale-95"
        >
          <svg
            className="h-6 w-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <button
          onClick={() => {
            const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
            window.dispatchEvent(event);
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-cream shadow-md transition-transform hover:scale-110 active:scale-95"
        >
          <svg
            className="h-6 w-6 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-forest/20 border-t-orange" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
