"use client";

import Tweet from "./Tweet";

interface TweetData {
  id: number;
  content: string;
  position: number;
  image_url?: string | null;
}

interface TweetFeedProps {
  tweets: TweetData[];
  paperTitle: string;
  bookmarkedIds: Set<number>;
  onToggleBookmark: (tweetId: number) => void;
}

export default function TweetFeed({
  tweets,
  paperTitle,
  bookmarkedIds,
  onToggleBookmark,
}: TweetFeedProps) {
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
          imageUrl={tweet.image_url}
        />
      ))}

      {/* End indicator */}
      <div className="flex flex-col items-center gap-2 bg-light-gray py-12 text-center">
        <div className="h-1 w-8 rounded-full bg-forest/20" />
        <p className="font-avenir text-sm text-forest/40">
          End of paper
        </p>
      </div>
    </div>
  );
}
