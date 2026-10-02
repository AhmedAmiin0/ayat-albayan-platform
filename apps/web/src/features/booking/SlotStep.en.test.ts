import en from '@ab/shared/i18n/en.json';
import { expect, it, vi } from 'vitest';
import { pickedText } from './SlotStep';

// The UI in English: the picked slot reads in English and joins with «, », not the Arabic «، ».
vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));

it('names the Riyadh time, then the family’s own clock', () => {
  expect(pickedText('2026-10-04T14:00:00.000Z', 'America/New_York')).toBe(
    'Sunday 4 October 17:00 Riyadh time, Student: Sunday 4 October 10:00 New York time',
  );
});
