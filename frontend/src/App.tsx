import { useState, useCallback } from 'react';
import { CaptionItem, Reference, SessionInfo } from './types';
import VideoPlayer from './components/VideoPlayer';
import CaptionFeed from './components/CaptionFeed';
import ReferencesPanel from './components/ReferencesPanel';
import DiscussionPanel from './components/DiscussionPanel';

type Tab = 'feed' | 'references';

export default function App() {
  const [url, setUrl] = useState('');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const [allReferences, setAllReferences] = useState<Reference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [discussionItem, setDiscussionItem] = useState<CaptionItem | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim()) return;

      setError(null);
      setCaptions([]);
      setAllReferences([]);
      setSession(null);
      setIsLoading(true);

      try {
        // 1. Start analysis and get session
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail ?? `Server error ${res.status}`);
        }

        const sessionData: SessionInfo = await res.json();
        setSession(sessionData);
        setIsLoading(false);
        setIsStreaming(true);

        // 2. Open SSE stream for real-time fact-check results
        const evtSource = new EventSource(`/api/stream/${sessionData.session_id}`);

        evtSource.addEventListener('caption', (evt) => {
          const item: CaptionItem = JSON.parse(evt.data);
          setCaptions((prev) => [...prev, item]);
          if (item.references?.length) {
            setAllReferences((prev) => {
              const existing = new Set(prev.map((r) => r.url));
              const newRefs = item.references.filter((r) => !existing.has(r.url));
              return [...prev, ...newRefs];
            });
          }
        });

        evtSource.addEventListener('done', () => {
          setIsStreaming(false);
          evtSource.close();
        });

        evtSource.onerror = () => {
          setIsStreaming(false);
          evtSource.close();
        };
      } catch (err: unknown) {
        setIsLoading(false);
        setIsStreaming(false);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    },
    [url]
  );

  const tabLabel = (tab: Tab): string => {
    if (tab === 'feed') {
      return captions.length ? `Live Feed (${captions.length})` : 'Live Feed';
    }
    return allReferences.length ? `References (${allReferences.length})` : 'References';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Navbar */}
      <header className="flex items-center gap-3 px-6 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <span className="text-xl font-bold text-indigo-400">🔍 FactCheck Live</span>
        <span className="text-xs text-gray-500">Real-time caption fact-checking</span>
      </header>

      {/* URL Input */}
      <div className="px-6 py-4 bg-gray-900 border-b border-gray-800 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
            required
            disabled={isLoading || isStreaming}
            className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm text-gray-100 placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || isStreaming}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
                       px-5 py-2 text-sm font-semibold transition-colors"
          >
            {isLoading ? 'Loading…' : isStreaming ? 'Streaming…' : 'Analyse'}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>

      {/* Main content */}
      {session ? (
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-0">
          {/* Left: Video */}
          <div className="lg:w-1/2 p-4 flex flex-col gap-3 min-h-0">
            <VideoPlayer videoId={session.video_id} />
            {/* Legend */}
            <div className="flex flex-wrap gap-2 text-xs">
              {(['true', 'false', 'contentious', 'context', 'unverifiable'] as const).map(
                (v) => {
                  const colors: Record<string, string> = {
                    true: 'bg-green-400',
                    false: 'bg-red-400',
                    contentious: 'bg-yellow-400',
                    context: 'bg-blue-400',
                    unverifiable: 'bg-gray-500',
                  };
                  const labels: Record<string, string> = {
                    true: 'True',
                    false: 'False',
                    contentious: 'Contentious',
                    context: 'Needs Context',
                    unverifiable: 'Unverifiable',
                  };
                  return (
                    <span key={v} className="flex items-center gap-1 text-gray-400">
                      <span className={`inline-block w-2 h-2 rounded-full ${colors[v]}`} />
                      {labels[v]}
                    </span>
                  );
                }
              )}
            </div>
          </div>

          {/* Right: Tabs */}
          <div className="lg:w-1/2 flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l border-gray-800">
            {/* Tab bar */}
            <div className="flex border-b border-gray-800 shrink-0">
              {(['feed', 'references'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors
                    ${activeTab === tab
                      ? 'border-b-2 border-indigo-500 text-indigo-400'
                      : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                  {tabLabel(tab)}
                </button>
              ))}
              {isStreaming && (
                <span className="ml-auto flex items-center pr-4 gap-1.5 text-xs text-indigo-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Live
                </span>
              )}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 p-4">
              {activeTab === 'feed' && (
                <CaptionFeed
                  items={captions}
                  isStreaming={isStreaming}
                  onOpenDiscussion={setDiscussionItem}
                />
              )}
              {activeTab === 'references' && (
                <ReferencesPanel references={allReferences} />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Landing / empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-6">
          <div className="text-6xl">🎬</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-2">
              Real-Time Fact-Checking
            </h2>
            <p className="text-gray-400 max-w-md">
              Paste a YouTube link above to start. Closed captions are fetched,
              analysed by AI, and colour-coded as <span className="text-green-400">true</span>,{' '}
              <span className="text-red-400">false</span>,{' '}
              <span className="text-yellow-400">contentious</span>, or{' '}
              <span className="text-blue-400">needs context</span>.
              Click any item to open a discussion with full references and definitions.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-sm text-left">
            {[
              { icon: '📺', title: 'Embedded Video', desc: 'Watch the video while reading live fact-checks.' },
              { icon: '📚', title: 'Running References', desc: 'All cited sources collected in one tab.' },
              { icon: '💬', title: 'Discussion & Definitions', desc: 'Click any caption to dive deeper with analysis, definitions, and sources.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-lg bg-gray-900 border border-gray-800 p-4">
                <div className="text-2xl mb-2">{icon}</div>
                <h3 className="font-semibold text-gray-200 mb-1">{title}</h3>
                <p className="text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discussion modal */}
      {discussionItem && (
        <DiscussionPanel
          item={discussionItem}
          onClose={() => setDiscussionItem(null)}
        />
      )}
    </div>
  );
}
