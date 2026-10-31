import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { pressEnabled } from '@/sales-course/testing/course-test-utils';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { fakeNow } from '@/test/fake-now';
import { seedFullAccess } from '@/test/staff-me';
import { changeBody, changeSundayToMonday, NOW } from '@/sales-course/change/change-test-setup';
import { CourseActionsSection } from './CourseActionsSection';
import { BASE, serve, SUB } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const c = t.courseActions;
const PATH = `${BASE}/course-times/change`;
const CLASH = { kind: 'teacher_busy', startsAt: changeBody.startsAt, endsAt: changeBody.startsAt };

const answer = (conflicts: unknown[]) => async (_m: string, path: string) =>
  path === `${PATH}/check`
    ? { conflicts, remaining: 5, endsOn: '2026-10-29' }
    : { subscriptionId: SUB, ruleIds: ['r1'], endsOn: '2026-10-29' };

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(NOW);
  mockApiFetch.mockImplementation(serve());
  mockApiSend.mockImplementation(answer([]));
});
afterEach(() => jest.useRealTimers());

const openTimes = async (role: 'admin' | 'sales' = 'admin') => {
  const client = createTestQueryClient();
  seedFullAccess(client, role);
  await renderWithQuery(<CourseActionsSection studentId="s1" subscriptionId={SUB} />, client);
  await fireEvent.press(await screen.findByRole('button', { name: c.times.action }));
  await screen.findAllByRole('checkbox', { name: '17:00' });
};

test('new days: the check and the save go to the profile route, the course count kept', async () => {
  await openTimes();
  expect(mockApiFetch).toHaveBeenCalledWith(`${PATH}?subscriptionId=${SUB}`);
  await changeSundayToMonday();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', `${PATH}/check`, expect.objectContaining(changeBody)));
  await pressEnabled(t.booking.courseChange.submit);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', PATH, { ...changeBody, clientRequestId: expect.any(String) }),
  );
  expect(await screen.findByText(t.booking.courseChange.done)).toBeTruthy();
});

test('the admin may save over a clash with a reason (override.reason)', async () => {
  mockApiSend.mockImplementation(answer([CLASH]));
  await openTimes();
  await changeSundayToMonday();
  const reason = await screen.findByLabelText(c.overrideReason);
  const save = screen.getByRole('button', { name: t.booking.courseChange.submit });
  expect(save.props.accessibilityState?.disabled).toBe(true);
  await fireEvent.changeText(reason, ' موافقة الأسرة ');
  await pressEnabled(t.booking.courseChange.submit);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', PATH, expect.objectContaining({ override: { reason: 'موافقة الأسرة' } })),
  );
});

test('sales never overrides: no reason field, the save stays disabled', async () => {
  mockApiSend.mockImplementation(answer([CLASH]));
  await openTimes('sales');
  await changeSundayToMonday();
  await screen.findByRole('button', { name: t.booking.courseChange.submit });
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', `${PATH}/check`, expect.anything()));
  expect(screen.queryByLabelText(c.overrideReason)).toBeNull();
  const save = screen.getByRole('button', { name: t.booking.courseChange.submit });
  expect(save.props.accessibilityState?.disabled).toBe(true);
});
