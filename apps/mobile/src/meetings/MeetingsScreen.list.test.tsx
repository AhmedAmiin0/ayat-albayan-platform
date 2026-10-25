import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MeetingsScreen } from './MeetingsScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useSegments: () => ['(tabs)'] }));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const M = t.meetingInvites.list;
const I = t.meetingInvites;
const base = { created_by: 'u1', created_at: '2026-10-05T11:30:00.000Z', ends_at: null, cancelled_at: null, invitees_count: 0, my_invite: null };
const at = { starts_at: '2026-10-20T14:00:00.000Z', planned_end_at: '2026-10-20T15:00:00.000Z' };
const early = { state: 'early', opens_at: '2026-10-20T13:45:00.000Z', closes_at: '2026-10-20T17:00:00.000Z' };
const rows = [
  { ...base, ...at, id: 's1', title: 'مجلس الإدارة', state: 'open', window: early, can_join: false, can_manage: true, invitees_count: 2 },
  { ...base, ...at, id: 's2', title: 'لقاء المعلمين', state: 'open', window: { ...early, state: 'open' }, can_join: true, can_manage: false, my_invite: { status: 'sent', channel: 'in_app' } },
  { ...base, ...at, id: 's3', title: 'لقاء ملغى', state: 'ended', window: null, can_join: false, can_manage: true, cancelled_at: '2026-10-10T00:00:00Z' },
  { ...base, starts_at: null, planned_end_at: null, id: 'i1', title: 'الآن', state: 'open', window: null, can_join: true, can_manage: true },
];
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const lists = () => mockApiFetch.mock.calls.filter(([p]) => p === '/meetings').length;

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => (path === '/meetings' ? rows : { permissions: ['meetings.read'] }));
});

test('my meetings and the ones I am invited to, each with its time and state', async () => {
  await renderWithQuery(<MeetingsScreen />);
  expect(await screen.findByText('مجلس الإدارة')).toBeTruthy();
  expect(screen.getByText(`${M.scheduledFor.replace('{when}', 'الثلاثاء 20 أكتوبر 17:00')} · ${M.inviteesCount.replace('{n}', '2')}`)).toBeTruthy();
  expect(screen.getByText(M.opensAt.replace('{when}', 'الثلاثاء 20 أكتوبر 16:45'))).toBeTruthy();
  expect(screen.getByText(new RegExp(M.invitedYou))).toBeTruthy();
  expect(screen.getByText(M.cancelled)).toBeTruthy();
  expect(screen.getByText(new RegExp(`^${M.instant} · `))).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.meetings.internal.enter })).toHaveLength(2); // can_join only
  expect(screen.getAllByRole('button', { name: M.reschedule })).toHaveLength(1); // scheduled, mine, not cancelled
  expect(screen.getAllByRole('button', { name: M.cancel })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: t.meetings.internal.end })).toHaveLength(1); // instant only, like web
});

test('reschedule: the same steppers, prefilled; PATCH the new UTC time, then the list refreshes', async () => {
  mockApiSend.mockResolvedValue(undefined);
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText('مجلس الإدارة');
  await press(M.reschedule);
  expect(screen.getByLabelText(`${I.mobile.hour}: 17`)).toBeTruthy();
  await fireEvent.press(screen.getAllByRole('button', { name: t.pricing.increase })[0] as never);
  await press(I.save);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/meetings/s1', { startsAt: '2026-10-20T15:00:00.000Z', durationMin: 60 }));
  await waitFor(() => expect(lists()).toBe(2));
  expect(await screen.findByRole('button', { name: M.reschedule })).toBeTruthy();
});

test('cancel asks first, then POSTs /cancel; a refusal reads its line', async () => {
  mockApiSend.mockResolvedValueOnce(undefined);
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText('مجلس الإدارة');
  await press(M.cancel);
  expect(screen.getByText(M.cancelConfirm)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await press(M.cancel);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/meetings/s1/cancel'));
  await waitFor(() => expect(lists()).toBe(2));
});

test('an instant meeting can invite too: a team member found by search', async () => {
  const staff = { kind: 'staff', id: '7b0c5f1e-1111-4a1a-8a1a-000000000001', name: 'أبرار', role: 'teacher' };
  const student = { kind: 'student', id: '7b0c5f1e-2222-4a1a-8a1a-000000000002', name: 'يوسف', code: 'AB-0182' };
  mockApiFetch.mockImplementation(async (path: string) => (path.startsWith('/meetings/invitee-options') ? [staff, student] : path === '/meetings' ? [] : {}));
  mockApiSend.mockResolvedValue({ id: 'm9', url: 'https://app/m/new', invitees: [], replayed: false });
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText(t.meetings.internal.empty);
  await press(t.meetings.new);
  await press(I.addInvitees);
  expect(screen.queryByRole('button', { name: 'يوسف · AB-0182' })).toBeNull(); // the team segment
  await screen.findByRole('button', { name: 'أبرار' });
  await press('أبرار');
  const chip = screen.getByRole('button', { name: I.removeInvitee.replace('{name}', 'أبرار') });
  expect(within(chip).getByText('أبرار')).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: I.tabs.students }));
  expect(await screen.findByRole('button', { name: 'يوسف · AB-0182' })).toBeTruthy();
  await press(t.meetings.internal.create);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/meetings', { invitees: [{ kind: 'staff', profileId: staff.id }], clientRequestId: expect.any(String) }),
  );
  expect(await screen.findByRole('button', { name: t.meetings.internal.enter })).toBeTruthy();
});
