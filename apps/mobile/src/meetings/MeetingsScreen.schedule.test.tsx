import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { MeetingsScreen } from './MeetingsScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useSegments: () => ['(tabs)'] }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const I = t.meetingInvites;
const invitation = 'السلام عليكم ورحمة الله،\nرابط الدخول: https://app/i/tok1';
const made = {
  id: 'm9',
  url: 'https://app/m/new',
  replayed: false,
  invitees: [
    { id: 'i1', kind: 'phone', display_name: '+201000000101', channel: 'link', status: 'window_closed', error_code: 'session_closed', link: 'https://app/i/tok1', invitation_text: invitation },
    { id: 'i2', kind: 'staff', display_name: 'أبرار', channel: 'in_app', status: 'sent', error_code: null, link: null, invitation_text: null },
  ],
};
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
let share: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(new Date('2026-10-12T10:07:00Z')); // 13:07 in Riyadh → the form opens at 13:30
  mockApiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? { role: 'sales', permissions: ['meetings.read', 'meetings.write'] } : []));
  share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
});
afterEach(() => jest.useRealTimers());

async function openForm() {
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText(t.meetings.internal.empty);
  await press(I.scheduledItem);
}

test('the form: 14 day chips from today, hour/minute/length steppers, the zone note', async () => {
  await openForm();
  const chips = screen.getAllByRole('radio');
  expect(chips).toHaveLength(14);
  expect(chips[0]).toHaveTextContent(I.mobile.today);
  expect(screen.getByLabelText(`${I.mobile.hour}: 13`)).toBeTruthy();
  expect(screen.getByLabelText(`${I.mobile.minute}: 30`)).toBeTruthy();
  expect(screen.getByLabelText(`${I.duration}: ${I.minutes.replace('{n}', '60')}`)).toBeTruthy();
  expect(screen.getByText(I.tzNote.replace('{tz}', 'الرياض'))).toBeTruthy();
});

test('tomorrow 14:45 for 75 minutes in Riyadh is sent as 11:45 UTC, with the typed phone', async () => {
  mockApiSend.mockResolvedValue(made);
  await openForm();
  await fireEvent.press(screen.getAllByRole('radio')[1] as never);
  const more = () => screen.getAllByRole('button', { name: t.pricing.increase });
  await fireEvent.press(more()[0] as never);
  await fireEvent.press(more()[1] as never);
  await fireEvent.press(more()[2] as never);
  await fireEvent.press(screen.getByRole('tab', { name: I.tabs.phone }));
  await fireEvent.changeText(screen.getByLabelText(I.tabs.phone), '+20 100 000 0101');
  await press(I.addPhone);
  expect(screen.getByRole('button', { name: I.removeInvitee.replace('{name}', '+201000000101') })).toBeTruthy();
  await press(t.meetings.internal.create);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/meetings', {
      startsAt: '2026-10-13T11:45:00.000Z',
      durationMin: 75,
      invitees: [{ kind: 'phone', phone: '+201000000101' }],
      clientRequestId: expect.any(String),
    }),
  );
});

test('after create: each recipient outcome; a closed window has the hint and shares its invitation', async () => {
  mockApiSend.mockResolvedValue(made);
  await openForm();
  await press(t.meetings.internal.create);
  expect(await screen.findByText(I.results.windowClosed)).toBeTruthy();
  expect(screen.getByText(I.results.windowClosedHint)).toBeTruthy();
  expect(screen.getByText(I.results.inApp)).toBeTruthy();
  expect(screen.getByText(ltr('https://app/m/new'))).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.meetings.internal.enter })).toBeNull(); // not open yet
  await press(`${I.results.share} — +201000000101`);
  expect(share).toHaveBeenCalledWith({ message: invitation });
  expect(screen.queryByRole('button', { name: `${I.results.share} — أبرار` })).toBeNull();
});

test('«رقم هاتف» is offered to admin and sales only', async () => {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? { role: 'teacher', permissions: ['meetings.write'] } : []));
  await openForm();
  expect(screen.getByRole('tab', { name: I.tabs.students })).toBeTruthy();
  expect(screen.queryByRole('tab', { name: I.tabs.phone })).toBeNull();
});

test('a wrong phone is refused before any call; a coded refusal reads its own line', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'starts_in_past' }));
  await openForm();
  await fireEvent.press(screen.getByRole('tab', { name: I.tabs.phone }));
  await fireEvent.changeText(screen.getByLabelText(I.tabs.phone), '0100');
  await press(I.addPhone);
  expect(screen.getByText(I.invalidPhone)).toBeTruthy();
  await press(t.meetings.internal.create);
  expect(await screen.findByText(I.errors.starts_in_past)).toBeTruthy();
});
