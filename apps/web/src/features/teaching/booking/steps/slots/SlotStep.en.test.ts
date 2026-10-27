import en from '@ab/shared/i18n/en.json';
import { expect, it, vi } from 'vitest';
import { pickedText } from './SlotStep';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

// The UI in English: the picked slot reads in English and joins with «, », not the Arabic «، ».
vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));

it('names the Riyadh time, then the family’s own clock', () => {
  expect(pickedText('2026-10-04T14:00:00.000Z', 'America/New_York', C24)).toBe(
    'Sunday 4 October 17:00 Riyadh time, Student: Sunday 4 October 10:00 New York time',
  );
});
