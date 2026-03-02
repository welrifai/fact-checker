import { Verdict } from '../types';

export const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  true: {
    label: 'True',
    bg: 'bg-green-900/40',
    text: 'text-green-300',
    border: 'border-green-700',
    dot: 'bg-green-400',
  },
  false: {
    label: 'False',
    bg: 'bg-red-900/40',
    text: 'text-red-300',
    border: 'border-red-700',
    dot: 'bg-red-400',
  },
  contentious: {
    label: 'Contentious',
    bg: 'bg-yellow-900/40',
    text: 'text-yellow-300',
    border: 'border-yellow-700',
    dot: 'bg-yellow-400',
  },
  context: {
    label: 'Needs Context',
    bg: 'bg-blue-900/40',
    text: 'text-blue-300',
    border: 'border-blue-700',
    dot: 'bg-blue-400',
  },
  unverifiable: {
    label: 'Unverifiable',
    bg: 'bg-gray-800/60',
    text: 'text-gray-400',
    border: 'border-gray-600',
    dot: 'bg-gray-500',
  },
};
