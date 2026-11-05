import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, noConfirmQueryClient, renderWithQuery } from '@/test/query';
import { OVERVIEW } from '@/calendar/overview/overview-fixtures';
import { LessonRowActions } from './LessonRowActions';

// No confirmation required (OFF, owner 2026-11-02) and «تصحيح حالة الحلقة» (owner 2026-11-03).
const action = {
  busyId: null,
  errorFor: () => null,
  confirm: jest.fn(),
  cancel: jest.fn(),
  correct: jest.fn(),
};
const base = OVERVIEW.lessons.find((l) => l.id === 'l-pending');
const lesson = () => {
  if (!base) throw new Error('fixture');
  return base;
};
const ENDED = '2000-01-01T10:00:00Z';
const show = (over: Partial<ReturnType<typeof lesson>>, client = noConfirmQueryClient()) => {
  const l = { ...lesson(), ...over };
  const ui = <LessonRowActions lesson={l} action={action as never} onReschedule={jest.fn()} />;
  return renderWithQuery(ui, client);
};

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

beforeEach(() => jest.clearAllMocks());

test('OFF: a scheduled lesson offers no «تأكيد» (cancel still there)', async () => {
  await show({ status: 'scheduled' });
  expect(screen.queryByRole('button', { name: new RegExp(t.today.confirm) })).toBeNull();
  expect(screen.getByRole('button', { name: new RegExp(t.today.cancel) })).toBeTruthy();
});

test('settled by the job: the three other statuses, each sent through action.correct', async () => {
  await show({ status: 'completed', auto_held: true, ends_at: ENDED }, createTestQueryClient());
  expect(screen.getByText(t.lessons.correct.outcomeTitle)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.lessons.correct.to.completed })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.correct.to.no_show }));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.correct.to.cancelled_by_teacher }));
  expect(action.correct.mock.calls).toEqual([
    ['l-pending', 'no_show'],
    ['l-pending', 'cancelled_by_teacher'],
  ]);
});

test('an ended lesson still «يحتاج تأكيد» offers all four', async () => {
  await show({ status: 'scheduled', ends_at: ENDED }, createTestQueryClient());
  for (const to of ['completed', 'no_show', 'excused', 'cancelled_by_teacher'] as const) {
    expect(screen.getByRole('button', { name: t.lessons.correct.to[to] })).toBeTruthy();
  }
});

test('a lesson held for real (no auto_held) offers no correction', async () => {
  await show({ status: 'completed', auto_held: false, ends_at: ENDED });
  expect(screen.queryByText(t.lessons.correct.outcomeTitle)).toBeNull();
});
