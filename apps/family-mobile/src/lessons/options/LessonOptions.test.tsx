import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { lesson, student } from '#/portal/portal.fixtures.ts';
import { LessonOptions } from './LessonOptions';

const mockSend = jest.fn();
const mockFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...args: unknown[]) => mockSend(...args),
  apiFetch: (path: string) => mockFetch(path),
}));

const now = new Date('2026-11-16T10:00:00.000Z');
const A = t.portal.actions;
const needs = (counts = false) =>
  lesson(now, 24 * 60, { status: 'scheduled', family: { group: false, counts, request: null } });
const onNotice = jest.fn();
const title = {
  heading: 'حلقة الغد · 6:30 م – 7:15 م',
  subline: 'الإثنين 17 نوفمبر · مع فاطمة · 45 دقيقة',
  decline: 'الاعتذار عن حلقة الغد',
};
const show = (l = needs()) =>
  renderWithQuery(
    <LessonOptions lesson={l} student={student()} now={now} title={title} onNotice={onNotice} />,
    freshQueryClient(),
  );
const RESULT = { lesson_id: 'l', status: 'confirmed', counts: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockSend.mockResolvedValue(RESULT);
});

test('«سأحضر» confirms from the menu, and the card says so', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: A.menuTitle }));
  await fireEvent.press(screen.getByRole('button', { name: A.confirm }));
  await waitFor(() => expect(onNotice).toHaveBeenCalledWith(A.confirmedNotice));
  expect(mockSend.mock.calls[0]?.[1]).toMatch(/\/lessons\/.+\/confirm$/);
});

test('«أعتذر»: the package line first, then the excuse with its reason', async () => {
  await show(needs(true));
  await fireEvent.press(screen.getByRole('button', { name: A.menuTitle }));
  expect(screen.getByText(title.subline)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: A.decline }));
  expect(screen.getByText(title.decline)).toBeTruthy();
  expect(screen.getByText(A.countsYes)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(A.reasonLabel), 'سفر مع الأسرة');
  await fireEvent.press(screen.getByRole('button', { name: A.declineConfirm }));
  await waitFor(() => expect(onNotice).toHaveBeenCalledWith(A.declinedNotice));
  expect(mockSend.mock.calls[0]?.[2]).toEqual({ reason: 'سفر مع الأسرة' });
});

test('a waiting request offers «سحب الطلب» instead of asking again', async () => {
  const request = {
    id: 'r', status: 'pending' as const, proposed_starts_at: '2026-11-18T14:30:00.000Z',
    note: null, decision_note: null, decided_at: null,
  };
  await show(lesson(now, 24 * 60, { status: 'scheduled', family: { group: false, counts: false, request } }));
  await fireEvent.press(screen.getByRole('button', { name: A.menuTitle }));
  expect(screen.queryByRole('button', { name: A.request })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: A.withdraw }));
  await waitFor(() => expect(onNotice).toHaveBeenCalledWith(A.withdrawnNotice));
});

test('«اطلب موعدًا آخر»: a free start of the week, a note, «أرسل الطلب»', async () => {
  const free = '2026-11-18T14:30:00.000Z';
  mockFetch.mockResolvedValue({ tz: 'Asia/Riyadh', step_min: 45, slots: [{ starts_at: free, ends_at: free }] });
  await show();
  await fireEvent.press(screen.getByRole('button', { name: A.menuTitle }));
  await fireEvent.press(screen.getByRole('button', { name: A.request }));
  await fireEvent.press(await screen.findByRole('radio', { name: /^(17:30|5:30 م)$/ }));
  await fireEvent.changeText(screen.getByLabelText(A.noteLabel), 'اختبار');
  await fireEvent.press(screen.getByRole('button', { name: A.send }));
  await waitFor(() => expect(onNotice).toHaveBeenCalledWith(A.sentNotice));
  expect(mockSend.mock.calls[0]?.[2]).toEqual({ startsAt: free, note: 'اختبار' });
  expect(mockFetch.mock.calls[0]?.[0]).toMatch(/\/lessons\/.+\/slots\?from=/);
});

test('a refused action says why, in the family’s words', async () => {
  mockSend.mockRejectedValue(new (jest.requireActual('@ab/mobile-kit').ApiError)(409, { code: 'lesson_started' }));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: A.menuTitle }));
  await fireEvent.press(screen.getByRole('button', { name: A.confirm }));
  expect(await screen.findByText(A.errors.lesson_started)).toBeTruthy();
});

test('a started lesson has no options', async () => {
  await show(lesson(now, -5, { status: 'scheduled', family: { group: false, counts: true, request: null } }));
  expect(screen.queryByRole('button', { name: A.menuTitle })).toBeNull();
});

test('a group lesson has no options: the academy changes it', async () => {
  await show(lesson(now, 24 * 60, { status: 'scheduled', family: { group: true, counts: false, request: null } }));
  expect(screen.queryByRole('button', { name: A.menuTitle })).toBeNull();
});
