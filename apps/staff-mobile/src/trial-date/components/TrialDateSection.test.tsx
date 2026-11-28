import type { StudentStatus } from '@ab/catalog';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { profile } from '@/students/shared/test-data';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { historyOf, trialRow } from '@/trial-date/testing/fixtures';
import { TrialDateSection } from './TrialDateSection';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: unknown) => mockPush(h) } }));

function serve(status: StudentStatus, permissions = ['booking.write']) {
  const history = historyOf([trialRow()], {
    status,
    allowed: !['active', 'pending_renewal', 'expired'].includes(status),
  });
  mockApi.onRead(async ({ path: p }) => (p === '/auth/me' ? { permissions } : history));
}
const action = () =>
  screen.queryByRole('button', { name: `${t.trialDate.action} — ${profile.name}` });

beforeEach(() => jest.clearAllMocks());

test.each(['new', 'trial', 'pending_subscription'] as const)(
  '%s: the action opens the trial-date screen; the history under it',
  async (status) => {
    serve(status);
    await renderWithQuery(
      <TrialDateSection student={{ ...profile, status }} />,
      createTestQueryClient({ meFromApi: true }),
    );
    await screen.findByText(t.trialDate.count.one);
    expect(mockApi.reads()).toContainEqual({
      method: 'GET',
      path: `/booking/trial-dates?studentId=${profile.id}`,
    });
    expect(screen.queryByText(t.trialDate.notAllowed)).toBeNull();
    const button = action();
    expect(button).toBeTruthy();
    if (button) await fireEvent.press(button);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/students/trial-date/[studentId]',
      params: { studentId: profile.id, name: profile.name, program: 'quran' },
    });
  },
);

test('active: no action, the reason in its place, the history still shown', async () => {
  serve('active');
  await renderWithQuery(
    <TrialDateSection student={profile} />,
    createTestQueryClient({ meFromApi: true }),
  );
  expect(await screen.findByText(t.trialDate.notAllowed)).toBeTruthy();
  expect(action()).toBeNull();
  expect(await screen.findByText(t.trialDate.outcome.upcoming)).toBeTruthy();
});

test('without booking.write: nothing once /auth/me answers', async () => {
  serve('trial', ['students.read']);
  await renderWithQuery(
    <TrialDateSection student={{ ...profile, status: 'trial' }} />,
    createTestQueryClient({ meFromApi: true }),
  );
  await waitFor(() => expect(screen.queryByTestId('trial-date-section')).toBeNull());
  expect(action()).toBeNull();
});
