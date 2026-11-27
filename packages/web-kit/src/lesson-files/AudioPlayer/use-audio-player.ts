import { resumeAt } from '@ab/client-core';
import { useHtmlAudio } from '@ab/web-kit/lesson-files/use-html-audio';
import { useResumeMap } from '@ab/web-kit/lesson-files/use-resume';
import type { Props } from './AudioPlayer.types';

export function useAudioPlayer({ id }: Pick<Props, 'id'>) {
  const from = resumeAt(useResumeMap(), id);
  const player = useHtmlAudio({ id, startAt: from });
  return { from, player };
}
