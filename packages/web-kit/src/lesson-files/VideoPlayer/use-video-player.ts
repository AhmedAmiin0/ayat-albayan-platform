import { resumeAt } from '@ab/client-core';
import { useRef } from 'react';
import { useHtmlAudio } from '@ab/web-kit/lesson-files/use-html-audio';
import { useResumeMap } from '@ab/web-kit/lesson-files/use-resume';
import type { Props } from './VideoPlayer.types';

export function useVideoPlayer({ id }: Pick<Props, 'id'>) {
  const from = resumeAt(useResumeMap(), id);
  const player = useHtmlAudio({ id, startAt: from });
  const frameRef = useRef<HTMLDivElement>(null);
  const paused = player.state.status !== 'playing';
  const full = () => void frameRef.current?.requestFullscreen().catch(() => undefined);
  return { from, player, frameRef, paused, full };
}
