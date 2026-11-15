import { createContext, useContext, useState } from 'react';

/**
 * A «احجز أيام الحلقات» notice (owner 2026-11-06) opens /sales/inbox?phone=…&course=<studentId>:
 * the route provides that student id (parseInboxSearch keeps a uuid only) and keeps it out of
 * the list's links, so only the chat it names opens with its «أيام الحلقات» dialog.
 */
export const LinkedCourseContext = createContext<string | null>(null);

/**
 * The chat's «أيام الحلقات» dialog state: the linked student first, then whatever is picked; a
 * newer notice for the chat already open opens its student too (state set while rendering).
 */
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
