import { useState } from 'react';
import type { LessonFileRowProps } from './LessonFileRow.types';

export function useLessonFileRow({ file, onOpen }: Pick<LessonFileRowProps, 'file' | 'onOpen'>) {
  const [playing, setPlaying] = useState(false);
  const audio = file.media === 'audio';
  const press = () => (audio ? setPlaying(!playing) : onOpen(file.id));
  return { playing, audio, press };
}
