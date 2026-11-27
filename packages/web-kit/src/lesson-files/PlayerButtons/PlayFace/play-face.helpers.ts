import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import type { Face } from './PlayFace.types';

const P = t.audioPlayer;

export const FACES: Face[] = [
  { glyph: 'play', label: P.play, when: false },
  { glyph: 'pause', label: P.pause, when: true },
];

const FACE_CLASS = cn(
  'col-start-1 row-start-1 inline-flex items-center justify-center gap-2',
  'transition-opacity duration-(--duration-quick) ease-ink',
);

/** Each face with whether it is hidden: the face not matching the play state fades out. */
export const facesFor = (playing: boolean) =>
  FACES.map((face) => {
    const hidden = face.when !== playing;
    return { ...face, hidden, className: cn(FACE_CLASS, hidden && 'opacity-0') };
  });
