"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import SwipeCard, { type PaperCardData } from "./SwipeCard";

interface SwipeStackProps {
  cards: PaperCardData[];
  onSelect: (card: PaperCardData) => void;
}

export default function SwipeStack({ cards, onSelect }: SwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeCards = cards.slice(currentIndex, currentIndex + 2);

  function handleSwipe(direction: "left" | "right") {
    const card = cards[currentIndex];
    if (direction === "right") {
      onSelect(card);
    }
    setCurrentIndex((prev) => prev + 1);
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="flex h-[480px] w-full max-w-[340px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cream-dark bg-cream/30 p-8 text-center">
        <p className="mb-2 font-bodoni text-xl text-forest">
          No more papers
        </p>
        <p className="font-avenir text-sm text-forest/60">
          Try a different search to find more
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-[480px] w-full max-w-[340px] items-center justify-center">
      <AnimatePresence>
        {activeCards
          .map((card, i) => (
            <SwipeCard
              key={`${card.title}-${currentIndex + i}`}
              card={card}
              active={i === 0}
              onSwipe={handleSwipe}
            />
          ))
          .reverse()}
      </AnimatePresence>
    </div>
  );
}
