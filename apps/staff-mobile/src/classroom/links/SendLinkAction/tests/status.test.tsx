import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { yusuf } from '@/today/testing/fixtures';
import { SendLinkAction } from '@/classroom/links/SendLinkAction/SendLinkAction';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(() => jest.clearAllMocks());
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
async function send() {
  await renderWithQuery(<SendLinkAction lessonId="l-1" student={yusuf} named={false} />);
  await press(t.classroom.sendLink);
  await press(t.mobileClassroom.sendConfirmAction);
}

test('a queued message (sending is off) says it waits, not «sent»', async () => {
  mockApi.onWrite(() => ({ expires_at: 'x', replayed: false, message_status: 'queued' }));
  await send();
  expect(await screen.findByText(t.inbox.messagingOff)).toBeTruthy();
  expect(screen.queryByText(t.classroom.linkSent)).toBeNull();
});

test('a failed Meta send shows an error and the button stays usable for a retry', async () => {
  mockApi.onWrite(() => ({ expires_at: 'x', replayed: false, message_status: 'failed' }));
  await send();
  expect(await screen.findByText(t.mobileClassroom.sendFailed)).toBeTruthy();
  expect(screen.queryByText(t.classroom.linkSent)).toBeNull();
  expect(
    screen.getByRole('button', { name: t.classroom.sendLink }).props.accessibilityState?.disabled,
  ).toBeFalsy();
});

test('cancel does nothing while the send is in flight (no second send)', async () => {
  mockApi.onWrite(() => new Promise(() => undefined));
  await send();
  await screen.findByText(t.classroom.sendingLink, { exact: false });
  await press(t.common.cancel);
  expect(
    screen.getByText(t.mobileClassroom.sendConfirm.replace('{name}', yusuf.name)),
  ).toBeTruthy();
  await waitFor(() => expect(mockApi.writes()).toHaveLength(1));
});
