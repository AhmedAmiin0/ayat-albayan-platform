import { upcoming } from '@/edit-time/testing/fixtures';
import { changeLine, lengthText } from './edit-time-text';

// Thursday 5 Nov 2026 18:00 Riyadh (UTC+3) = 17:00 Cairo (UTC+2, winter), 45 min.
const lesson = { ...upcoming, starts_at: '2026-11-05T15:00:00.000Z', ends_at: '2026-11-05T15:45:00.000Z' };
const state = { picked: '2026-11-08T14:00:00.000Z', durationMin: 60, reason: '', notify: false };

test('the change line reads both starts on the clock of the viewer zone it is given', () => {
  const riyadh = changeLine(lesson, state, { tz: 'Asia/Riyadh', cycle: '24' });
  expect(riyadh).toBe(`الخميس 5 نوفمبر 18:00 · ${lengthText(45)} ← الأحد 8 نوفمبر 17:00 · ${lengthText(60)}`);
  const cairo = changeLine(lesson, state, { tz: 'Africa/Cairo', cycle: '24' });
  expect(cairo).toBe(`الخميس 5 نوفمبر 17:00 · ${lengthText(45)} ← الأحد 8 نوفمبر 16:00 · ${lengthText(60)}`);
});

test('no new start keeps the recorded one on both sides', () => {
  const line = changeLine(lesson, { ...state, picked: null, durationMin: 45 }, { tz: 'Asia/Riyadh', cycle: '12' });
  expect(line).toBe(`الخميس 5 نوفمبر 6:00 م · ${lengthText(45)} ← الخميس 5 نوفمبر 6:00 م · ${lengthText(45)}`);
});
