import { pickProblem, type PickedFile, type UploadProblem } from '@ab/client-core';
import type { LessonFileKind } from '@ab/shared';
import { useRef, useState } from 'react';
import { useUploadFile } from '@/features/teaching/lesson-files/use-lesson-files';

/** One picked file's line: waiting, on its way, up, or why not. */
export type QueueState = 'queued' | 'uploading' | 'done' | UploadProblem;

export interface QueueItem {
  key: string;
  name: string;
  state: QueueState;
}

interface Choice {
  lessonId: string;
  kind: LessonFileKind;
  visible: boolean;
}

const picked = (file: File): PickedFile =>
  ({ name: file.name, mime: file.type, size: file.size, body: file });

/** Each file is checked (type, 25 MiB), then uploaded in turn; cancel drops waiting ones. */
export function useUploadQueue(choice: Choice) {
  const upload = useUploadFile();
  const [items, setItems] = useState<QueueItem[]>([]);
  const stopped = useRef(false);
  const mark = (key: string, state: QueueState) =>
    setItems((all) => all.map((i) => (i.key === key ? { ...i, state } : i)));
  const send = async (key: string, file: File) => {
    if (stopped.current) return;
    mark(key, 'uploading');
    const sent = await upload.mutateAsync({ ...choice, file: picked(file) }).then(
      () => 'done' as const,
      () => 'failed' as const,
    );
    mark(key, sent);
  };
  const pick = async (files: readonly File[]) => {
    stopped.current = false;
    const lines = files.map((file, i) => ({
      key: `${String(Date.now())}-${String(i)}`,
      name: file.name,
      state: pickProblem({ mime: file.type, size: file.size }) ?? ('queued' as const),
    }));
    setItems(lines);
    for (const [i, line] of lines.entries()) {
      const file = files[i];
      if (line.state === 'queued' && file) await send(line.key, file);
    }
  };
  const cancel = () => {
    stopped.current = true;
    setItems((all) => all.filter((i) => i.state !== 'queued'));
  };
  const busy = items.some((i) => i.state === 'queued' || i.state === 'uploading');
  return { items, pick, cancel, busy };
}
