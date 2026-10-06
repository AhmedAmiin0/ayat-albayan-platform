import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { StudentsScreen } from './StudentsScreen';
import { listItem, page } from './test-data';

const L = t.mobileStudentFile.list;
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const counts = { trial: 2, active: 5, paused: 1, churned: 3 };
function serve() {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/students/status-counts')) return counts;
    if (path === '/students/teacher-options') return [{ id: 'a1b2c3d4-0000-4000-8000-000000000001', display_name_ar: 'منى', meeting_link: null }];
    return page([listItem()]);
  });
}
const listCalls = () => mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.startsWith('/students?'));

beforeEach(() => mockApiFetch.mockReset());

test('status pills show the API counts, and picking one filters the list on the server', async () => {
  serve();
  await renderWithQuery(<StudentsScreen />);
  expect(await screen.findByRole('tab', { name: `${t.enums.studentStatus.active} 5` })).toBeTruthy();
  expect(screen.getByRole('tab', { name: `${L.statusAll} 11` })).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: `${t.enums.studentStatus.trial} 2` }));
  await waitFor(() => expect(listCalls().some((p) => p.includes('status=trial'))).toBe(true));
});

test('the panel filters by teacher, program, package, weekly, tz and sorts; clear resets', async () => {
  serve();
  await renderWithQuery(<StudentsScreen />);
  await fireEvent.press(await screen.findByText(L.filtersShow));
  await fireEvent.press(await screen.findByRole('tab', { name: 'منى' }));
  await fireEvent.press(screen.getByRole('tab', { name: t.students.packageFilter.low }));
  await fireEvent.press(screen.getByRole('tab', { name: t.students.weeklyYes }));
  await fireEvent.press(screen.getByRole('tab', { name: t.enums.program.quran }));
  await fireEvent.press(screen.getByRole('tab', { name: L.sort.name }));
  await waitFor(() => {
    const last = listCalls().at(-1) ?? '';
    for (const part of ['teacher=a1b2c3d4', 'package=low', 'weekly=yes', 'program=quran', 'sort=name', 'dir=asc']) expect(last).toContain(part);
  });
  await fireEvent.press(screen.getByText(L.filtersHide));
  expect(screen.getByText(L.active.replace('{n}', '4'))).toBeTruthy();
  await fireEvent.press(screen.getByText(L.clear));
  await waitFor(() => expect(listCalls().at(-1)).toBe('/students?page=1&pageSize=25'));
});

test('a time zone pill filters by tz; the counts follow the other filters', async () => {
  serve();
  await renderWithQuery(<StudentsScreen />);
  await fireEvent.press(await screen.findByText(L.filtersShow));
  await fireEvent.press(await screen.findByRole('tab', { name: new RegExp(`${t.tz['Africa/Cairo']}`) }));
  await waitFor(() => expect(listCalls().at(-1)).toContain('tz=Africa%2FCairo'));
  expect(mockApiFetch.mock.calls.some((c: unknown[]) => String(c[0]).startsWith('/students/status-counts') && String(c[0]).includes('tz=Africa%2FCairo'))).toBe(true);
});
