import type { PortalRecording } from '@ab/shared';

/** A lesson recorded in parts shows once: its first part in the api's order. */
export const firstPerLesson = (items: readonly PortalRecording[]): PortalRecording[] =>
  items.filter((r, i, all) => all.findIndex((x) => x.lesson_id === r.lesson_id) === i);
