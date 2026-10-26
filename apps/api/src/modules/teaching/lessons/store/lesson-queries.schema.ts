import { instant, localDate, SETTING_DEFAULTS, timeZone } from '@ab/shared';
import { z } from 'zod';
import { badRequest } from '../../../../common/http/errors';
import { addDays, startOfLocalDay } from '../../scheduling/occurrences/horizon';
import { parseOrThrow } from '../../../../common/http/http';
import type { LessonWindow } from '../lessons.queries';

/** The window is the page (R-NFR-08): at most 31 days per request (docs/10 §3 Lists). */
const MAX_RANGE_MS = 31 * 86_400_000;

const windowSchema = z
  .object({ from: instant, to: instant, teacherId: z.uuid().optional() })
  .refine((q) => Date.parse(q.to) > Date.parse(q.from), { message: 'to_before_from', path: ['to'] });

const daySchema = z.object({ date: localDate, tz: timeZone.optional() });

/** `?from&to[&teacherId]` → [from, to); 400 validation_failed / range_too_large. */
export function parseWindow(query: unknown): LessonWindow {
  const q = parseOrThrow(windowSchema, query);
  const w = { from: new Date(q.from), to: new Date(q.to), teacherId: q.teacherId };
  if (w.to.getTime() - w.from.getTime() > MAX_RANGE_MS) throw badRequest('range_too_large');
  return w;
}

/**
 * `?date&tz` → that local day, [00:00, next 00:00) in tz (DST days are 23 or 25 h). No `tz` →
 * `defaultTz` (settings.academy_timezone).
 */
export function parseDay(query: unknown, defaultTz: string = SETTING_DEFAULTS.academy_timezone): LessonWindow {
  const { date, tz = defaultTz } = parseOrThrow(daySchema, query);
  return { from: startOfLocalDay(date, tz), to: startOfLocalDay(addDays(date, 1), tz) };
}
