"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";

export interface PaperCardData {
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  pdfUrl: string | null;
  source: string;
}

interface SwipeCardProps {
  card: PaperCardData;
  active: boolean;
  onSwipe: (direction: "left" | "right") => void;
}

const SOURCE_LABELS: Record<string, string> = {
  semantic_scholar: "Semantic Scholar",
  openalex: "OpenAlex",
  arxiv: "arXiv",
  crossref: "CrossRef",
};

export default function SwipeCard({ card, active, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 100) {
      onSwipe("right");
    } else if (info.offset.x < -100) {
      onSwipe("left");
    }
  }

  if (!active) {
    return (
      <div className="absolute h-[480px] w-full max-w-[340px] rounded-2xl bg-cream shadow-md" />
    );
  }

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      initial={{ scale: 1, opacity: 1 }}
      exit={{
        x: x.get() > 0 ? 600 : -600,
        opacity: 0,
        transition: { duration: 0.3 },
      }}
      className="absolute flex h-[480px] w-full max-w-[340px] cursor-grab flex-col rounded-2xl bg-cream shadow-xl active:cursor-grabbing"
    >
      {/* Swipe indicators */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute left-4 top-4 z-10 rounded-lg border-3 border-green-600 px-3 py-1 font-avenir text-lg font-bold text-green-600"
      >
        READ
      </motion.div>
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute right-4 top-4 z-10 rounded-lg border-3 border-red-500 px-3 py-1 font-avenir text-lg font-bold text-red-500"
      >
        SKIP
      </motion.div>

      {/* Card content */}
      <div className="flex flex-1 flex-col overflow-hidden p-6">
        {/* Source badge */}
        <span className="mb-3 inline-block w-fit rounded-full bg-forest px-3 py-1 font-avenir text-xs font-semibold text-cream">
          {SOURCE_LABELS[card.source] || card.source}
        </span>

        {/* Title */}
        <h2 className="mb-2 line-clamp-3 font-bodoni text-xl font-bold leading-tight text-forest">
          {card.title}
        </h2>

        {/* Authors */}
        <p className="mb-3 line-clamp-1 font-avenir text-sm text-forest/60">
          {card.authors.slice(0, 3).join(", ")}
          {card.authors.length > 3 && ` +${card.authors.length - 3} more`}
        </p>

        {/* Abstract */}
        <p className="line-clamp-[10] flex-1 font-avenir text-sm leading-relaxed text-forest/80">
          {card.abstract || "No abstract available."}
        </p>
      </div>

      {/* Bottom hint */}
      <div className="border-t border-cream-dark px-6 py-3 text-center font-avenir text-xs text-forest/40">
        Swipe right to read &middot; left to skip
      </div>
    </motion.div>
  );
}
