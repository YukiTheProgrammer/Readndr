"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Tweet from "./Tweet";

interface TweetData {
  id: number;
  content: string;
  position: number;
  parent_id?: number | null;
}

interface TweetFeedProps {
  tweets: TweetData[];
  paperTitle: string;
  bookmarkedIds: Set<number>;
  onToggleBookmark: (tweetId: number) => void;
}

interface TweetGroup {
  parent: TweetData;
  children: TweetData[];
}

export default function TweetFeed({
  tweets,
  paperTitle,
  bookmarkedIds,
  onToggleBookmark,
}: TweetFeedProps) {
  const [expandedParents, setExpandedParents] = useState<Set<number>>(
    new Set()
  );

  // Determine if this is hierarchical or flat (legacy) data
  const hasHierarchy = tweets.some(
    (t) => t.parent_id !== null && t.parent_id !== undefined
  );

  function toggleExpand(parentId: number) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  }

  // Flat rendering for legacy tweets (no hierarchy)
  if (!hasHierarchy) {
    return (
      <div className="hide-scrollbar flex flex-col divide-y divide-cream-dark/30">
        {tweets.map((tweet) => (
          <Tweet
            key={tweet.id}
            tweetId={tweet.id}
            content={tweet.content}
            position={tweet.position}
            totalTweets={tweets.length}
            paperTitle={paperTitle}
            isBookmarked={bookmarkedIds.has(tweet.id)}
            onToggleBookmark={onToggleBookmark}
          />
        ))}

        <div className="flex flex-col items-center gap-2 bg-light-gray py-12 text-center">
          <div className="h-1 w-8 rounded-full bg-forest/20" />
          <p className="font-avenir text-sm text-forest/40">End of paper</p>
        </div>
      </div>
    );
  }

  // Group tweets into parent + children
  const parents = tweets.filter(
    (t) => t.parent_id === null || t.parent_id === undefined
  );
  const childMap = new Map<number, TweetData[]>();
  for (const t of tweets) {
    if (t.parent_id != null) {
      const arr = childMap.get(t.parent_id) || [];
      arr.push(t);
      childMap.set(t.parent_id, arr);
    }
  }

  const groups: TweetGroup[] = parents.map((p) => ({
    parent: p,
    children: (childMap.get(p.id) || []).sort(
      (a, b) => a.position - b.position
    ),
  }));

  return (
    <div className="hide-scrollbar flex flex-col">
      {groups.map((group) => {
        const isExpanded = expandedParents.has(group.parent.id);
        const hasChildren = group.children.length > 0;

        return (
          <div key={group.parent.id}>
            <Tweet
              tweetId={group.parent.id}
              content={group.parent.content}
              position={group.parent.position}
              totalTweets={parents.length}
              paperTitle={paperTitle}
              isBookmarked={bookmarkedIds.has(group.parent.id)}
              onToggleBookmark={onToggleBookmark}
              isParent={true}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              onToggleExpand={() => toggleExpand(group.parent.id)}
            />

            <AnimatePresence initial={false}>
              {isExpanded &&
                group.children.map((child) => (
                  <motion.div
                    key={child.id}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <Tweet
                      tweetId={child.id}
                      content={child.content}
                      position={child.position}
                      totalTweets={parents.length}
                      paperTitle={paperTitle}
                      isBookmarked={bookmarkedIds.has(child.id)}
                      onToggleBookmark={onToggleBookmark}
                      childPosition={child.position}
                      totalChildren={group.children.length}
                    />
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        );
      })}

      <div className="flex flex-col items-center gap-2 bg-light-gray py-12 text-center">
        <div className="h-1 w-8 rounded-full bg-forest/20" />
        <p className="font-avenir text-sm text-forest/40">End of paper</p>
      </div>
    </div>
  );
}
