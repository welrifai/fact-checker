import { CaptionItem } from '../types';
import { VERDICT_CONFIG } from './verdictConfig';
import DefinitionTooltip from './DefinitionTooltip';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  item: CaptionItem;
  onClose: () => void;
}

export default function DiscussionPanel({ item, onClose }: Props) {
  const cfg = VERDICT_CONFIG[item.verdict] ?? VERDICT_CONFIG.unverifiable;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-lg mx-4 rounded-xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${cfg.border} ${cfg.bg}`}>
          <span className={`flex items-center gap-2 text-sm font-semibold ${cfg.text}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            {cfg.label} · {item.confidence}% confidence
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto scroll-slim">
          {/* Timestamp */}
          <p className="text-xs text-gray-500 font-mono">
            {formatTime(item.start)} – {formatTime(item.end)}
          </p>

          {/* Caption text */}
          <div className="rounded-md bg-gray-800 p-3 text-sm text-gray-100 leading-relaxed">
            <DefinitionTooltip text={item.text} definitions={item.definitions} />
          </div>

          {/* Explanation */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Analysis
            </h3>
            <p className="text-sm text-gray-200">{item.explanation}</p>
          </div>

          {/* Definitions */}
          {item.definitions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Definitions
              </h3>
              <div className="space-y-2">
                {item.definitions.map((d, i) => (
                  <div key={i} className="rounded-md bg-gray-800 p-2">
                    <span className="text-xs font-semibold text-indigo-300">{d.term}: </span>
                    <span className="text-xs text-gray-300">{d.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {item.references.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                References
              </h3>
              <div className="space-y-2">
                {item.references.map((ref, i) => (
                  <div key={i} className="rounded-md bg-gray-800 p-2">
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                      {ref.title}
                    </a>
                    {ref.snippet && (
                      <p className="mt-0.5 text-xs text-gray-400 italic">"{ref.snippet}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
