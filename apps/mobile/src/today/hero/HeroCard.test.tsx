import { fireEvent, screen } from '@testing-library/react-native';
import { allowedLessonEvents } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson, muscat, pending } from '../testing/fixtures';
import { HeroCard } from './HeroCard';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

// 16:20 Riyadh: the 16:00 lesson runs (inside the join window), the 17:00 one is 40 minutes away.
beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true }));
afterEach(() => jest.useRealTimers());

const show = (hero: Parameters<typeof HeroCard>[0]['hero']) => {
  const on = { onConfirm: jest.fn(), onDetails: jest.fn() };
  return { on, done: renderWithQuery(<HeroCard hero={hero} busy={false} {...on} />) };
};

test('a lesson waiting for confirmation: «تأكيد الحلقة» first, then «التفاصيل»', async () => {
  const { on, done } = show({ kind: 'running', lesson: pending });
  await done;
  expect(screen.getByText(t.today.running)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.today.confirmLesson }));
  expect(on.onConfirm).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.today.details }));
  expect(on.onDetails).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: t.classroom.enter })).toBeNull();
});

test('confirmed and in the join window: «ادخل الحلقة» is the primary', async () => {
  await show({ kind: 'running', lesson: lesson({ id: 'c', status: 'confirmed' }) }).done;
  expect(screen.getByRole('button', { name: t.classroom.enter })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.today.confirmLesson })).toBeNull();
});

test('confirmed and not joinable yet: only «التفاصيل»; the lead counts the minutes', async () => {
  await show({ kind: 'next', lesson: muscat, minutes: 40 }).done;
  expect(screen.getByText('الحلقة التالية · بعد 40 دقيقة')).toBeTruthy();
  expect(screen.getAllByRole('button')).toHaveLength(1);
  expect(screen.getByRole('button', { name: t.today.details })).toBeTruthy();
});

test('confirm not offered by the API (another role): no «تأكيد الحلقة»', async () => {
  const noConfirm = lesson({ id: 'n', allowed_events: allowedLessonEvents('scheduled').filter((e) => e !== 'confirm') });
  await show({ kind: 'next', lesson: { ...noConfirm, starts_at: muscat.starts_at, ends_at: muscat.ends_at }, minutes: 40 }).done;
  expect(screen.queryByRole('button', { name: t.today.confirmLesson })).toBeNull();
});
