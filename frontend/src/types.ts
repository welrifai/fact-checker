export type Verdict = 'true' | 'false' | 'contentious' | 'context' | 'unverifiable';

export interface Reference {
  title: string;
  url: string;
  snippet: string;
}

export interface Definition {
  term: string;
  definition: string;
}

export interface CaptionItem {
  id: number;
  start: number;
  end: number;
  text: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  references: Reference[];
  definitions: Definition[];
}

export interface SessionInfo {
  session_id: string;
  video_id: string;
  title: string;
}
