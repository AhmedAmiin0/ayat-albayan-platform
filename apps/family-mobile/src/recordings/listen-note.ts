import { listenText, type ListenState } from '@ab/client-core';
import { ltr, t } from '@ab/mobile-kit';

/** «جديد», «توقفت عند 12:40», «استمعت إليه كاملًا». */
export const listenNote = (state: ListenState): string => listenText(state, t.lessonFiles, ltr);

/** «44 دقيقة» of a recording (rounded; an unknown length reads 0). */
export const minutesOf = (seconds: number | null): string =>
  String(Math.round((seconds ?? 0) / 60));
