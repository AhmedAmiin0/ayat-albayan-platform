import type { BubbleWord, TickKind } from '@ab/shared';

export interface TickGlyphProps {
  kind: TickKind;
  ink: string;
  word: BubbleWord | null;
}
