"use client";

import { useState } from "react";

interface TweetProps {
  tweetId: number;
  content: string;
  position: number;
  totalTweets: number;
  paperTitle: string;
  isBookmarked: boolean;
  onToggleBookmark: (tweetId: number) => void;
}

export default function Tweet({
  tweetId,
  content,
  position,
  totalTweets,
  paperTitle,
  isBookmarked,
  onToggleBookmark,
}: TweetProps) {
  const [animating, setAnimating] = useState(false);

  function handleBookmark() {
    setAnimating(true);
    onToggleBookmark(tweetId);
    setTimeout(() => setAnimating(false), 300);
  }

  return (
    <div className="border-b border-cream-dark/50 bg-cream p-4">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest font-bodoni text-sm font-bold text-cream">
          R
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bodoni text-sm font-semibold text-forest">
            {paperTitle}
          </p>
          <p className="font-avenir text-xs text-forest/50">
            {position + 1}/{totalTweets}
          </p>
        </div>
      </div>

      {/* Content */}
      <p className="mb-3 whitespace-pre-wrap font-avenir text-[15px] leading-relaxed text-forest">
        {content}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleBookmark}
          className={`rounded-full p-2 transition-all ${
            animating ? "scale-125" : "scale-100"
          } ${isBookmarked ? "text-orange" : "text-forest/30 hover:text-orange/60"}`}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill={isBookmarked ? "currentColor" : "none"}
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
    </div>
  );
}
