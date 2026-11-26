export type FigureTone = 'ok' | 'bad' | 'act' | 'ink';

export interface FigureProps {
  value: string;
  label: string;
  tone: FigureTone;
}
