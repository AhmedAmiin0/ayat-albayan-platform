import {
  lessonDayQuerySchema,
  lessonWindowQuerySchema,
  startOfLocalDay,
} from '@ab/schedule';
import { SETTING_DEFAULTS } from '@ab/settings';
import { addDays } from '@ab/time';
import type { z } from 'zod';
import { badRequest } from '@/common/http/errors';
import { parseOrThrow } from '@/common/http/http';
import type { LessonWindow } from '@/modules/teaching/lessons/lessons.repo';

/** The window is the page (R-NFR-08): at most 31 days per request (docs/10 §3 Lists). */
const MAX_RANGE_MS = 31 * 86_400_000;

/** A parsed `?from&to[&teacherId]` → [from, to); 400 range_too_large past 31 days. */
export function toWindow(q: z.output<typeof lessonWindowQuerySchema>): LessonWindow {
  const w = { from: new Date(q.from), to: new Date(q.to), teacherId: q.teacherId };
  if (w.to.getTime() - w.from.getTime() > MAX_RANGE_MS) throw badRequest('range_too_large');
  return w;
}

/** `?from&to[&teacherId]` → [from, to); 400 validation_failed / range_too_large. */
export const parseWindow = (query: unknown): LessonWindow =>
  toWindow(parseOrThrow(lessonWindowQuerySchema, query));

/**
 * A parsed `?date&tz` → that local day, [00:00, next 00:00) in tz (DST days are 23 or 25 h). No
 * `tz` → `defaultTz` (settings.academy_timezone).
 */
export function toDay(
  q: z.output<typeof lessonDayQuerySchema>,
  defaultTz: string = SETTING_DEFAULTS.academy_timezone,
): LessonWindow {
  const { date, tz = defaultTz } = q;
  return { from: startOfLocalDay(date, tz), to: startOfLocalDay(addDays(date, 1), tz) };
}

export const parseDay = (query: unknown, defaultTz?: string): LessonWindow =>
  toDay(parseOrThrow(lessonDayQuerySchema, query), defaultTz);
