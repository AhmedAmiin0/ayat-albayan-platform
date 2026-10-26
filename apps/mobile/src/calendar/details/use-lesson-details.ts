import { useState } from 'react';

/**
 * Which lesson's details sheet is open. It keeps the id and reads the lesson from the screen's
 * current list, so a confirm or cancel from the sheet (optimistic, R-MOB-03) shows at once; when a
 * refetch no longer lists it (moved off the day) the last version seen stays, not the one opened.
 */
export function useLessonDetails<L extends { id: string }>(lessons: readonly L[] | undefined) {
  const [picked, setPicked] = useState<L | null>(null);
  const found = picked ? lessons?.find((l) => l.id === picked.id) : undefined;
  // Remember the newest version seen (React's «adjust state while rendering» pattern).
  if (found && found !== picked) setPicked(found);
  return { lesson: found ?? picked, open: (l: L) => setPicked(l), close: () => setPicked(null) };
}
