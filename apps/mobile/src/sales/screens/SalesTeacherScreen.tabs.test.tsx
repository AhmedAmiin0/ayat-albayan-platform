import type { SalesTeacherOverview } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { ltr } from '@/core/ui/primitives/Ltr';
import { renderWithQuery } from '@/test/query';
import { teacher } from '../testing/fixtures';
import { SalesTeacherScreen } from './SalesTeacherScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 't1' }) }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const o = t.sales.teachers.overview;
const overview: SalesTeacherOverview = {
  weekly: [{ rule_id: 'r1', weekday: 0, time: '20:00', duration_min: 45, students: [{ name: 'يوسف أحمد', code: 'AB-0183' }] }],
  attendance: {
    days: 30,
    totals: { held: 2, student_absent: 1, cancelled_by_teacher: 0, cancelled_by_admin: 1, other: 0 },
    latest: [{ lesson_id: 'l1', starts_at: '2026-10-25T17:00:00.000Z', status: 'no_show', students: [{ name: 'جنى علي', code: 'AB-0190' }] }],
  },
};
const api = (over: SalesTeacherOverview | Error = overview) => async (path: string) => {
  if (path === '/sales/teachers') return [teacher()];
  if (over instanceof Error) throw over;
  return over;
};
const inSales = (node: ReactElement) => renderWithQuery(<TreeBaseProvider value="/sales">{node}</TreeBaseProvider>);
beforeEach(() => {
  mockApiFetch.mockReset();
  jest.mocked(router.push).mockClear();
});

test('«الطلاب» by default, the overview not read until a tab asks; «الجدول» shows the slots in Riyadh with students', async () => {
  mockApiFetch.mockImplementation(api());
  await inSales(<SalesTeacherScreen />);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(screen.getByRole('tab', { name: t.sales.teachers.tabs.students }).props.accessibilityState).toMatchObject({ selected: true });
  expect(mockApiFetch).not.toHaveBeenCalledWith('/sales/teachers/t1/overview');
  await fireEvent.press(screen.getByRole('tab', { name: t.sales.teachers.tabs.schedule }));
  expect(await screen.findByText('الأحد الساعة 20:00 · 45 دقيقة')).toBeTruthy();
  expect(screen.getByText(`يوسف أحمد ${ltr('AB-0183')}`)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/teachers/t1/overview');
});

test('«الحضور»: the 30 days\' totals and the latest lessons with their status chip', async () => {
  mockApiFetch.mockImplementation(api());
  await inSales(<SalesTeacherScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: t.sales.teachers.tabs.attendance }));
  expect(await screen.findByRole('header', { name: o.window.replace('{days}', '30') })).toBeTruthy();
  expect(screen.getByText(/^عُقدت 2 · غياب الطالب 1/)).toBeTruthy();
  expect(screen.getByText(`جنى علي ${ltr('AB-0190')}`)).toBeTruthy();
  expect(screen.getByText(t.enums.lessonStatus.no_show)).toBeTruthy();
});

test('empty overview: «لا توجد مواعيد أسبوعية» and «لا توجد حلقات»; a failure shows the retry', async () => {
  mockApiFetch.mockImplementation(api({ weekly: [], attendance: { ...overview.attendance, latest: [] } }));
  const view = await inSales(<SalesTeacherScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: t.sales.teachers.tabs.schedule }));
  expect(await screen.findByText(o.noWeekly)).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: t.sales.teachers.tabs.attendance }));
  expect(await screen.findByText(o.noLessons)).toBeTruthy();
  await view.unmount();
  mockApiFetch.mockImplementation(api(new ApiError(500, { code: 'boom' })));
  await inSales(<SalesTeacherScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: t.sales.teachers.tabs.schedule }));
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
});

test('a student row opens «تفاصيل الطالب» in the sales tree and the admin\'s student file in the admin tree', async () => {
  mockApiFetch.mockImplementation(api());
  const view = await inSales(<SalesTeacherScreen />);
  await fireEvent.press(await screen.findByText('يوسف أحمد'));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st1');
  await view.unmount();
  jest.mocked(router.push).mockClear();
  await renderWithQuery(<SalesTeacherScreen />);
  await fireEvent.press(await screen.findByText('يوسف أحمد'));
  expect(router.push).toHaveBeenCalledWith('/students/st1');
});
