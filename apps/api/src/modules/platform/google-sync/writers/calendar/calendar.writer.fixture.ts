import { vi } from 'vitest';
import { CalendarWriter } from './calendar.writer';
import type { EventLesson } from './event-format';
import type { GoogleAlerts } from '../../google-alerts';
import { FakeGoogle } from '../../http/google-client.fake';
import type { GoogleMapQueries } from '../../map/google-map.queries';
import type { GoogleSyncSource, LessonSource } from '../../sync/google-sync.source';
import { eventLesson, TEACHER_ID } from '../../google-sync.fakes';

// Test-only: a CalendarWriter over a FakeGoogle with one mapped teacher calendar. Never Google.

export const CAL = 'teacher-cal@group.calendar.google.com';

export function setup(src: LessonSource | null) {
  const google = new FakeGoogle();
  google.calendars.set(CAL, 'آيات البيان — Teacher A');
  const source = { lesson: vi.fn().mockResolvedValue(src) };
  const map = { teacherCalendar: vi.fn().mockResolvedValue(CAL) };
  const alerts = { teacherUnmapped: vi.fn(), scriptStillRunning: vi.fn() };
  const writer = new CalendarWriter(source as unknown as GoogleSyncSource, map as unknown as GoogleMapQueries, alerts as unknown as GoogleAlerts);
  return { google, writer, map, alerts, source, live: { live: true as const, google } };
}

/** A platform-origin lesson by default; `{ origin: false }` = imported (managed = its teacher's owner). */
export const lessonSource = (over: Partial<Omit<LessonSource, 'lesson'>> = {}, lesson: Partial<EventLesson> = {}): LessonSource => ({
  origin: true, managed: true, teacherId: TEACHER_ID, lesson: eventLesson(lesson), ...over,
});
