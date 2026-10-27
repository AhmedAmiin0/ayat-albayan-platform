// Test fixtures for the family portal (test-only).
import type { PortalHome, PortalLesson, PortalReport, PortalStudent } from '@ab/shared';

export const kid = (over: Partial<PortalStudent> = {}): PortalStudent => ({
  id: 's1', code: 'AB-0201', name: 'سلمى', tz: 'Africa/Cairo', contact_is_self: false, ...over,
});

export const home = (over: Partial<PortalHome> = {}): PortalHome => ({
  kind: 'guardian', students: [kid(), kid({ id: 's2', name: 'يوسف' })], renew_url: 'https://wa.me/966500000000', ...over,
});

export const lesson = (over: Partial<PortalLesson> = {}): PortalLesson => ({
  id: 'l1', starts_at: '2026-10-27T16:00:00.000Z', ends_at: '2026-10-27T16:30:00.000Z', status: 'confirmed',
  teacher: { display_name_ar: 'أبرار', display_name_en: null }, way_in: 'classroom', meeting_url: null,
  window: { state: 'open', opens_at: '2026-10-27T15:50:00.000Z', closes_at: '2026-10-27T16:45:00.000Z' },
  ...over,
});

export const report = (over: Partial<PortalReport> = {}): PortalReport => ({
  id: 'r1', lesson_id: 'l1', lesson_starts_at: '2026-10-20T16:00:00.000Z', sent_at: '2026-10-20T18:00:00.000Z',
  teacher: { display_name_ar: 'أبرار', display_name_en: null }, recording_id: null, ...over,
});
