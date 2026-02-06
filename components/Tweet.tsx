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
  isParent?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  childPosition?: number;
  totalChildren?: number;
}

export default function Tweet({
  tweetId,
  content,
  position,
  totalTweets,
  paperTitle,
  isBookmarked,
  onToggleBookmark,
  isParent = false,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  childPosition,
  totalChildren,
}: TweetProps) {
  const [animating, setAnimating] = useState(false);

  const isChild = childPosition !== undefined;

  function handleBookmark() {
    setAnimating(true);
    onToggleBookmark(tweetId);
    setTimeout(() => setAnimating(false), 300);
  }

  return (
    <div
      className={`border-b border-cream-dark/50 p-4 ${
        isChild ? "bg-cream/60 pl-8" : "bg-cream"
      }`}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bodoni text-sm font-bold ${
            isChild
              ? "bg-forest/20 text-forest"
              : "bg-forest text-cream"
          }`}
        >
          {isChild ? "↳" : "R"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bodoni text-sm font-semibold text-forest">
            {paperTitle}
          </p>
          <p className="font-avenir text-xs text-forest/50">
            {isChild
              ? `Detail ${childPosition! + 1}/${totalChildren}`
              : `${position + 1}/${totalTweets}`}
          </p>
        </div>
        {isParent && hasChildren && (
          <button
            onClick={onToggleExpand}
            className="shrink-0 rounded-full p-1.5 text-forest/40 transition-colors hover:bg-forest/10 hover:text-forest"
          >
            <svg
              className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Content — clickable for parents with children */}
      <div
        onClick={isParent && hasChildren ? onToggleExpand : undefined}
        className={isParent && hasChildren ? "cursor-pointer" : ""}
      >
        <p className="mb-3 whitespace-pre-wrap font-avenir text-[15px] leading-relaxed text-forest">
          {content}
        </p>
      </div>

      {/* Expand hint for parents */}
      {isParent && hasChildren && !isExpanded && (
        <button
          onClick={onToggleExpand}
          className="mb-2 font-avenir text-xs text-orange hover:text-orange-light"
        >
          Tap to expand details
        </button>
      )}

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
