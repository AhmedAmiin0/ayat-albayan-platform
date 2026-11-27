import { MediaGlyph } from '@ab/web-kit/lesson-files/MediaGlyph';
import type { PlayFaceProps } from './PlayFace.types';
import { facesFor } from './play-face.helpers';

/** Both faces share one cell and cross-fade so the width holds; the hidden face is aria-hidden. */
export function PlayFace({ playing }: PlayFaceProps) {
  const faces = facesFor(playing);
  return (
    <span className="grid">
      {faces.map((face) => (
        <span key={face.glyph} aria-hidden={face.hidden} className={face.className}>
          <MediaGlyph name={face.glyph} />
          {face.label}
        </span>
      ))}
    </span>
  );
}
