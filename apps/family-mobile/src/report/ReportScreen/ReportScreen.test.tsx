import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { reportPage } from '@/portal/portal.fixtures';
import { ReportScreen } from './ReportScreen';

const mockFetch = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));

const R = t.portal.app.report;
const opened = jest.spyOn(Linking, 'openURL');
const open = (params: Record<string, string>) =>
  jest.mocked(useLocalSearchParams).mockReturnValue(params);
const show = () => renderWithQuery(<ReportScreen />, freshQueryClient());

beforeEach(() => {
  jest.clearAllMocks();
  opened.mockResolvedValue(true);
});

test("the page: its title, the student's name, the grade, and the page's own PDF", async () => {
  mockFetch.mockResolvedValue(reportPage());
  open({ id: 'r1', student: 's1' });
  await show();
  expect(await screen.findAllByText(t.enums.grade.excellent)).not.toHaveLength(0);
  expect(screen.getByText(R.title)).toBeTruthy();
  expect(screen.getByText(/سارة · /)).toBeTruthy();
  expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/report-pages/by-report/r1'));
  expect(screen.queryByRole('button', { name: R.recording })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: R.pdf }));
  await waitFor(() => expect(opened).toHaveBeenCalledWith('https://files.example/report.pdf'));
});

test('a recording in the link shows its button', async () => {
  mockFetch.mockResolvedValue(reportPage());
  open({ id: 'r1', student: 's1', rec: 'rec1' });
  await show();
  expect(await screen.findByRole('button', { name: R.recording })).toBeTruthy();
});

test('a link without the report id is refused', async () => {
  open({ student: 's1' });
  jest.spyOn(console, 'error').mockImplementation(jest.fn());
  await expect(show()).rejects.toThrow();
});

test('pulling the page down reads the report again', async () => {
  mockFetch.mockResolvedValue(reportPage());
  open({ id: 'r1', student: 's1' });
  await show();
  const teacher = await screen.findByText(t.reportPage.teacher.replace('{name}', 'فاطمة'));
  const reads = mockFetch.mock.calls.length;
  await fireEvent(teacher, 'refresh');
  await waitFor(() => expect(mockFetch.mock.calls.length).toBeGreaterThan(reads));
});
