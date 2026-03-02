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
  onOpenDiscussion: (item: CaptionItem) => void;
}

export default function CaptionCard({ item, onOpenDiscussion }: Props) {
  const cfg = VERDICT_CONFIG[item.verdict] ?? VERDICT_CONFIG.unverifiable;

  return (
    <div
      className={`rounded-lg border p-3 mb-2 transition-all ${cfg.bg} ${cfg.border} cursor-pointer hover:brightness-110`}
      onClick={() => onOpenDiscussion(item)}
      title="Click to open discussion"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-mono">
          {formatTime(item.start)} – {formatTime(item.end)}
        </span>
        <span
          className={`flex items-center gap-1 text-xs font-semibold ${cfg.text}`}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
          <span className="ml-1 text-gray-500">({item.confidence}%)</span>
        </span>
      </div>

      {/* Caption text with definition tooltips */}
      <p className="text-sm text-gray-100 leading-snug mb-1">
        <DefinitionTooltip text={item.text} definitions={item.definitions} />
      </p>

      {/* Explanation */}
      {item.explanation && (
        <p className={`text-xs italic ${cfg.text} opacity-80`}>
          {item.explanation}
        </p>
      )}
    </div>
  );
}
