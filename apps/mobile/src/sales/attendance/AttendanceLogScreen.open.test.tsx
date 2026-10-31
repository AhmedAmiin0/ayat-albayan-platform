import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { openSigned } from '@/teacher';
import { AttendanceLogScreen } from './AttendanceLogScreen';
import { dayDateOf } from './attendance-log-text';
import { logTable } from './fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('@/teacher', () => ({ openSigned: jest.fn(async () => undefined) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));

const w = t.sales.student.log;
const openLabel = w.openReport.replace('{date}', dayDateOf('2026-10-27T15:00:00.000Z'));
const inSales = (node: ReactElement) => renderWithQuery(<TreeBaseProvider value="/sales">{node}</TreeBaseProvider>);
beforeEach(() => {
  mockApiFetch.mockReset();
  jest.mocked(router.push).mockClear();
  jest.mocked(openSigned).mockClear();
});

test('her student: only the row with a sent report is a button, and it opens that report\'s PDF as «التقارير»', async () => {
  mockApiFetch.mockResolvedValue(logTable());
  await inSales(<AttendanceLogScreen />);
  const rows = await screen.findAllByRole('button', { name: openLabel });
  expect(rows).toHaveLength(1);
  await fireEvent.press(rows[0] ?? screen.getByText(w.sent));
  expect(openSigned).toHaveBeenCalledWith('/sales/students/st1/reports/rep1/pdf');
});

test('a PDF not ready yet says so above the table', async () => {
  mockApiFetch.mockResolvedValue(logTable());
  jest.mocked(openSigned).mockRejectedValueOnce(new ApiError(409, { code: 'pdf_not_ready' }));
  await inSales(<AttendanceLogScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: openLabel }));
  expect(await screen.findByText(t.reports.error.pdf_not_ready)).toBeTruthy();
});

test('not her student (`mine` false): a sent report opens too (owner 2026-10-30)', async () => {
  mockApiFetch.mockResolvedValue(logTable({ mine: false }));
  await inSales(<AttendanceLogScreen />);
  expect(await screen.findByRole('button', { name: openLabel })).toBeTruthy();
});

test('the admin tree: the admin\'s route, and a sent report opens the admin\'s report view', async () => {
  mockApiFetch.mockResolvedValue(logTable());
  await renderWithQuery(<AttendanceLogScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: openLabel }));
  expect(mockApiFetch).toHaveBeenCalledWith('/students/st1/attendance');
  expect(router.push).toHaveBeenCalledWith('/students/reports/view/rep1');
});

test('rows are keyed by lesson id (FlashList recycles by key)', async () => {
  mockApiFetch.mockResolvedValue(logTable());
  await inSales(<AttendanceLogScreen />);
  await screen.findByText(w.sent);
  const list = screen.getByLabelText(w.title);
  const keyOf = list.props.keyExtractor as ((row: { lesson_id: string }, i: number) => string) | undefined;
  expect(logTable().items.map((r, i) => keyOf?.(r, i))).toEqual(['l1', 'l2', 'l3']);
});

test('loading, then an unknown student (404) says so; another failure the load error with retry', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(404, { code: 'student_not_found' }));
  const view = await inSales(<AttendanceLogScreen />);
  expect(await screen.findByText(t.sales.student.notFound)).toBeTruthy();
  await view.unmount();
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await inSales(<AttendanceLogScreen />);
  expect(await screen.findByText(t.sales.loadFailed)).toBeTruthy();
  mockApiFetch.mockResolvedValue(logTable());
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText(w.sent)).toBeTruthy();
});
