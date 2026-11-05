import { createContext, useContext, useState } from 'react';

/**
 * A «احجز أيام الحلقات» notice (owner 2026-11-06) opens /sales/inbox?phone=…&course=<studentId>:
 * the route provides that student id (parseInboxSearch keeps a uuid only) and drops it on the
 * next navigation, so the chat it opens starts with its «أيام الحلقات» dialog open.
 */
export const LinkedCourseContext = createContext<string | null>(null);

/** The chat's «أيام الحلقات» dialog state: the linked student first, then whatever is picked. */
export function useLinkedCourse() {
  return useState<string | null>(useContext(LinkedCourseContext));
}
