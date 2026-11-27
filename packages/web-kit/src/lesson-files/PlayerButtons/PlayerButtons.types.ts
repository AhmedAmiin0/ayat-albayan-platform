import type { PlayerSpeed } from '@ab/client-core';
import type { HtmlAudio } from '@ab/web-kit/lesson-files/use-html-audio';

export interface Props {
  controls: HtmlAudio['controls'];
  speed: PlayerSpeed;
  playing: boolean;
}

export type SpeedKey = `${PlayerSpeed}`;
