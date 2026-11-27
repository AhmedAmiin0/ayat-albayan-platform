import type { MediaGlyphName } from '@ab/web-kit/lesson-files/MediaGlyph';

export interface PlayFaceProps {
  playing: boolean;
}

export interface Face {
  glyph: MediaGlyphName;
  label: string;
  when: boolean;
}
