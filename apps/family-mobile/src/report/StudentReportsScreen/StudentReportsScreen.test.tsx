import { screen } from '@testing-library/react-native';
import { pathKey, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { student } from '@/portal/portal.fixtures';
import { StudentReportsScreen } from './StudentReportsScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswer(path)),
}));

const mockHome: { kind: string; students: unknown[] } = { kind: 'student', students: [] };
const mockAnswer = (path: string): unknown =>
  path.startsWith('/portal/me') ? { ...mockHome, renew_url: null } : { reports: [] };
const R = t.portal.app;

function show() {
  const client = freshQueryClient();
  client.setQueryData(pathKey('/auth/me'), { id: 'u1', role: 'student', permissions: [] });
  return renderWithQuery(<StudentReportsScreen />, client);
}

test("a student's own login: «my reports» and their own list", async () => {
  Object.assign(mockHome, { kind: 'student', students: [student({ contact_is_self: true })] });
  await show();
  expect(await screen.findByText(R.reports.empty)).toBeTruthy();
  expect(screen.getByText(R.reports.title)).toBeTruthy();
});

test('a login that holds no student: the no-students note under the tab title', async () => {
  Object.assign(mockHome, { kind: 'guardian', students: [] });
  await show();
  expect(await screen.findByText(t.portal.noStudents)).toBeTruthy();
  expect(screen.getByText(R.tabs.reports)).toBeTruthy();
});
