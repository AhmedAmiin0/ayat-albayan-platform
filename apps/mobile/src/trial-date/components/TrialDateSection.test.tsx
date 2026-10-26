import type { StudentStatus } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { profile } from '@/students/shared/test-data';
import { renderWithQuery } from '@/test/query';
import { historyOf, trialRow } from '../testing/fixtures';
import { TrialDateSection } from './TrialDateSection';

// The admin student file: «موعد تجريبي جديد» + «مواعيد الحلقة التجريبية» (R-STU-05).
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: unknown) => mockPush(h) } }));

function serve(status: StudentStatus, permissions = ['booking.write']) {
  const history = historyOf([trialRow()], { status, allowed: !['active', 'pending_renewal', 'expired'].includes(status) });
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? { permissions } : history));
}
const action = () => screen.queryByRole('button', { name: `${t.trialDate.action} — ${profile.name}` });

beforeEach(() => jest.clearAllMocks());

test.each(['new', 'trial', 'pending_subscription'] as const)('%s: the action opens the trial-date screen; the history under it', async (status) => {
  serve(status);
  await renderWithQuery(<TrialDateSection student={{ ...profile, status }} />);
  await screen.findByText(t.trialDate.count.one);
  expect(mockApiFetch).toHaveBeenCalledWith(`/booking/trial-dates?studentId=${profile.id}`);
  expect(screen.queryByText(t.trialDate.notAllowed)).toBeNull();
  const button = action();
  expect(button).toBeTruthy();
  if (button) await fireEvent.press(button);
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/students/trial-date/[studentId]',
    params: { studentId: profile.id, name: profile.name, program: 'quran' },
  });
});

test('active: no action, the reason in its place, the history still shown', async () => {
  serve('active');
  await renderWithQuery(<TrialDateSection student={profile} />);
  expect(await screen.findByText(t.trialDate.notAllowed)).toBeTruthy();
  expect(action()).toBeNull();
  expect(await screen.findByText(t.trialDate.outcome.upcoming)).toBeTruthy();
});

test('without booking.write: nothing once /auth/me answers', async () => {
  serve('trial', ['students.read']);
  await renderWithQuery(<TrialDateSection student={{ ...profile, status: 'trial' }} />);
  await waitFor(() => expect(screen.queryByTestId('trial-date-section')).toBeNull());
  expect(action()).toBeNull();
});
