import type { Glyph, Tone } from '@ab/money';

export interface StatusChipProps {
  tone: Tone;
  glyph: Glyph;
  /** The ar.json word, e.g. t.enums.leadStatus[status]. Always shown. */
  label: string;
  size?: 'md' | 'sm';
}
