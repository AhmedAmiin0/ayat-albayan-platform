import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { OVERVIEW } from '@/calendar/overview/overview-fixtures';
import { LessonRowActions } from './LessonRowActions';

// The academy default (owner 2026-11-02): no confirmation required.
const action = { busyId: null, errorFor: () => null, confirm: jest.fn(), cancel: jest.fn() };
const base = OVERVIEW.lessons.find((l) => l.id === 'l-pending');
const lesson = () => {
  if (!base) throw new Error('fixture');
  return base;
};
const show = (over: Partial<ReturnType<typeof lesson>>) => {
  const l = { ...lesson(), ...over };
  const ui = <LessonRowActions lesson={l} action={action as never} onReschedule={jest.fn()} />;
  return renderWithQuery(ui);
};

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

beforeEach(() => jest.clearAllMocks());

test('a scheduled lesson offers no «تأكيد» (cancel still there)', async () => {
  await show({ status: 'scheduled' });
  expect(screen.queryByRole('button', { name: new RegExp(t.today.confirm) })).toBeNull();
  expect(screen.getByRole('button', { name: new RegExp(t.today.cancel) })).toBeTruthy();
});

test('held automatically: «لم تنعقد الحلقة؟» cancels this lesson by the teacher or the student', async () => {
  await show({ status: 'completed', auto_held: true });
  expect(screen.getByText(t.lessons.correct.title)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.correct.byTeacher }));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.correct.byStudent }));
  expect(action.cancel.mock.calls).toEqual([
    ['l-pending', { scope: 'one', by: 'teacher', reason: t.lessons.correct.byTeacher }],
    ['l-pending', { scope: 'one', by: 'student', reason: t.lessons.correct.byStudent }],
  ]);
});

test('a lesson held for real (no auto_held) offers no correction', async () => {
  await show({ status: 'completed', auto_held: false });
  expect(screen.queryByText(t.lessons.correct.title)).toBeNull();
});
