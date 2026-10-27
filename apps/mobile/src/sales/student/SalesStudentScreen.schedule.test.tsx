import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { I18nManager } from 'react-native';
import { setClockPref } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { details, upcoming, weeklySlot } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const s = t.sales.student.schedule;
const openRow = new RegExp(`^${t.lessons.sheet.openRow.replace('{names}', 'يوسف أحمد')} · `);
beforeEach(() => {
  mockApiFetch.mockReset();
  fakeNow(new Date('2026-10-27T10:00:00Z'));
});
afterEach(() => {
  jest.useRealTimers();
  setClockPref('auto');
});

test('«الجدول» (RTL): an imported (Riyadh) rule in Riyadh with the Cairo student\'s clock, 24 h then 12 h on the setting', async () => {
  expect(I18nManager.isRTL).toBe(true);
  mockApiFetch.mockResolvedValue(details());
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByRole('header', { name: s.title })).toBeTruthy();
  expect(screen.getByRole('header', { name: s.upcoming })).toBeTruthy();
  expect(screen.getByText(`الأحد · الثلاثاء · الخميس الساعة 20:00 ${t.schedule.riyadhTime}`)).toBeTruthy();
  expect(screen.getByText('عند الطالب: الأحد · الثلاثاء · الخميس الساعة 19:00 بتوقيت القاهرة')).toBeTruthy();
  expect(screen.getByText('مع أبرار محمد · 45 دقيقة')).toBeTruthy();
  await act(async () => setClockPref('12'));
  expect(screen.getByText(`الأحد · الثلاثاء · الخميس الساعة 8:00 م ${t.schedule.riyadhTime}`)).toBeTruthy();
  expect(screen.getByText('عند الطالب: الأحد · الثلاثاء · الخميس الساعة 7:00 م بتوقيت القاهرة')).toBeTruthy();
});

test.each(['Asia/Riyadh', 'Asia/Kuwait'])('a student on Riyadh\'s clock (%s): no «عند الطالب» line, no zone label', async (tz) => {
  mockApiFetch.mockResolvedValue(details({ schedule: { student_tz: tz, weekly: [weeklySlot], upcoming: [] } }));
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText('الأحد · الثلاثاء · الخميس الساعة 20:00')).toBeTruthy();
  expect(screen.queryByText(/^عند الطالب/)).toBeNull();
});

test('upcoming: one row per lesson under its day with the status chip; the next 5, then «عرض الكل»', async () => {
  const lessons = ['01', '03', '05', '08', '10', '12', '15'].map((d, i) => upcoming(`u${i}`, `2026-11-${d}T17:00:00.000Z`));
  mockApiFetch.mockResolvedValue(details({ schedule: { student_tz: 'Africa/Cairo', weekly: [weeklySlot], upcoming: lessons } }));
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.upcoming)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: openRow })).toHaveLength(5);
  expect(screen.getByText(/1 نوفمبر/)).toBeTruthy();
  expect(screen.getAllByText(t.enums.lessonStatus.scheduled)).toHaveLength(5);
  await fireEvent.press(screen.getByRole('button', { name: s.showAll.replace('{n}', '7') }));
  expect(screen.getAllByRole('button', { name: openRow })).toHaveLength(7);
  await fireEvent.press(screen.getByRole('button', { name: s.showLess }));
  expect(screen.getAllByRole('button', { name: openRow })).toHaveLength(5);
  expect(screen.queryByText(/https?:\/\//)).toBeNull();
});

test('a tap opens the sales lesson sheet with «تغيير الموعد» and «إلغاء الحلقة» on her student\'s lesson', async () => {
  mockApiFetch.mockResolvedValue(details());
  await renderWithQuery(<SalesStudentScreen />);
  const [first] = await screen.findAllByRole('button', { name: openRow });
  if (!first) throw new Error('no row');
  expect(within(first).getByText('20:00')).toBeTruthy();
  await fireEvent.press(first);
  expect(await screen.findByRole('button', { name: t.sales.lessonActions.reschedule })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.sales.lessonActions.cancel })).toBeTruthy();
});

test('empty states: «لا جدول ثابت» and «لا حلقات قادمة»; an old cache without «الجدول» shows no section', async () => {
  mockApiFetch.mockResolvedValue(details({ schedule: { student_tz: 'Africa/Cairo', weekly: [], upcoming: [] } }));
  const first = await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.noWeekly)).toBeTruthy();
  expect(screen.getByText(s.noUpcoming)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^عرض الكل/ })).toBeNull();
  await first.unmount();
  const old = details();
  delete old.schedule;
  mockApiFetch.mockResolvedValue(old);
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(t.sales.student.subscription)).toBeTruthy();
  expect(screen.queryByText(s.title)).toBeNull();
});
