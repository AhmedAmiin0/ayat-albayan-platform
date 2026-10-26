import { useRef, useState } from 'react';

/**
 * Which lesson's details sheet is open. It keeps the id and reads the lesson from the screen's
 * current list, so a confirm or cancel from the sheet (optimistic, R-MOB-03) shows at once; when a
 * refetch no longer lists it (moved off the day) the last version seen stays, not the one opened.
 */
export function useLessonDetails<L extends { id: string }>(lessons: readonly L[] | undefined) {
  const [picked, setPicked] = useState<L | null>(null);
  const seen = useRef<L | null>(null);
  const found = picked ? lessons?.find((l) => l.id === picked.id) : undefined;
  if (found) seen.current = found;
  const lesson = picked ? (seen.current ?? picked) : null;
  const open = (l: L) => {
    seen.current = null;
    setPicked(l);
  };
  return { lesson, open, close: () => setPicked(null) };
}
