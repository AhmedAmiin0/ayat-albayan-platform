import type { HtmlAudio } from '@ab/web-kit/lesson-files/use-html-audio';

export interface Props {
  player: Pick<HtmlAudio, 'state' | 'controls'>;
  /** The saved stop the player opened at (0: a new one). */
  from: number;
}
