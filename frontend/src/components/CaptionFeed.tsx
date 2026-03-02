import { useEffect, useRef } from 'react';
import { CaptionItem } from '../types';
import CaptionCard from './CaptionCard';

interface Props {
  items: CaptionItem[];
  isStreaming: boolean;
  onOpenDiscussion: (item: CaptionItem) => void;
}

export default function CaptionFeed({ items, isStreaming, onOpenDiscussion }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length]);

  if (!items.length && !isStreaming) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No captions yet. Submit a URL to start.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-slim pr-1">
      {items.map((item) => (
        <CaptionCard
          key={item.id}
          item={item}
          onOpenDiscussion={onOpenDiscussion}
        />
      ))}
      {isStreaming && (
        <div className="flex items-center gap-2 py-2 text-gray-400 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Analysing next caption…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
