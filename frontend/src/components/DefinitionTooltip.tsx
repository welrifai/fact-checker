import { useState } from 'react';
import { Definition } from '../types';

interface Props {
  text: string;
  definitions: Definition[];
}

export default function DefinitionTooltip({ text, definitions }: Props) {
  const [active, setActive] = useState<Definition | null>(null);

  if (!definitions.length) return <span>{text}</span>;

  // Build a regex that matches any defined term (case-insensitive)
  const escaped = definitions.map((d) =>
    d.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) => {
        const def = definitions.find(
          (d) => d.term.toLowerCase() === part.toLowerCase()
        );
        if (!def) return <span key={i}>{part}</span>;
        return (
          <span key={i} className="relative inline-block">
            <span
              className="underline decoration-dotted cursor-help text-indigo-300 hover:text-indigo-200"
              onMouseEnter={() => setActive(def)}
              onMouseLeave={() => setActive(null)}
            >
              {part}
            </span>
            {active === def && (
              <span className="absolute z-50 bottom-full left-0 mb-1 w-64 rounded-md bg-gray-900 border border-gray-600 p-2 text-xs text-gray-200 shadow-xl">
                <strong className="block text-indigo-300 mb-1">{def.term}</strong>
                {def.definition}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
