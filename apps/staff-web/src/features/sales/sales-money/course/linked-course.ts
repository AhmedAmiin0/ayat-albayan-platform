import { createContext, useContext, useState } from 'react';

/** parseInboxSearch keeps only a uuid course id, out of list links, so only that chat opens it. */
export const LinkedCourseContext = createContext<string | null>(null);

/** A newer notice for the open chat opens its student too (state set while rendering). */
export function useLinkedCourse() {
  const linked = useContext(LinkedCourseContext);
  const [seen, setSeen] = useState(linked);
  const [course, setCourse] = useState<string | null>(linked);
  if (linked !== seen) {
    setSeen(linked);
    setCourse(linked ?? course);
  }
  return [course, setCourse] as const;
}
