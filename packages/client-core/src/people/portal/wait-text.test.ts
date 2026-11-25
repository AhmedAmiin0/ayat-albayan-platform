import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import type { PortalLesson } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lessonWaitText } from './wait-text';

const l: PortalLesson = {
  id: 'l1', starts_at: '2026-11-15T15:30:00.000Z', ends_at: '2026-11-15T16:15:00.000Z',
  status: 'confirmed', teacher: { display_name_ar: 'فاطمة', display_name_en: null },
  way_in: 'classroom', meeting_url: null,
  window: { state: 'early', opens_at: '2026-11-15T15:20:00.000Z', closes_at: '2026-11-15T16:45:00.000Z' },
};
const input = { words: ar.portal, clock: { tz: 'UTC', cycle: '24' as const, locale: 'ar' as const } };

describe('lessonWaitText', () => {
  it('names the reason, and the opening time on the family clock', () => {
    expect(lessonWaitText('cancelled', l, input)).toBe(ar.portal.cancelled);
    expect(lessonWaitText('noWayIn', l, input)).toBe(ar.portal.noWayIn);
    expect(lessonWaitText('opensAt', l, input)).toBe('يُتاح الدخول من 15:20');
  });
});
