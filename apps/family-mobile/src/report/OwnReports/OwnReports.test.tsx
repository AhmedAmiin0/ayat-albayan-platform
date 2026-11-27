import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { report, student } from '@/portal/portal.fixtures';
import { OwnReports } from './OwnReports';

const mockReports: { reports: unknown[] } = { reports: [] };
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async () => mockReports),
}));

const R = t.portal.app.reports;
const show = () => renderWithQuery(<OwnReports student={student()} />, freshQueryClient());

test('no sent report: the empty note', async () => {
  mockReports.reports = [];
  await show();
  expect(await screen.findByText(R.empty)).toBeTruthy();
});

test("this month's count on top, then a row per report", async () => {
  const now = new Date();
  mockReports.reports = [report(now, { id: 'a' }), report(now, { id: 'b' })];
  await show();
  expect(await screen.findByText(R.thisMonth)).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.portal.openReport })).toHaveLength(2);
});

test('reports from an older month only: this month counts zero', async () => {
  mockReports.reports = [report(new Date('2025-01-10T10:00:00Z'))];
  await show();
  expect(await screen.findByText('0')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.portal.openReport })).toHaveLength(1);
});
