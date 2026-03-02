import { Reference } from '../types';

interface Props {
  references: Reference[];
}

export default function ReferencesPanel({ references }: Props) {
  if (!references.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        References will appear here as captions are analysed.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-slim pr-1 space-y-3">
      {references.map((ref, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-700 bg-gray-800/60 p-3"
        >
          <a
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-indigo-400 hover:text-indigo-300 underline break-words"
          >
            {ref.title}
          </a>
          {ref.snippet && (
            <p className="mt-1 text-xs text-gray-400 italic">"{ref.snippet}"</p>
          )}
          <p className="mt-0.5 text-xs text-gray-600 break-all">{ref.url}</p>
        </div>
      ))}
    </div>
  );
}
