import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { GUARDIAN_PHONE, inboxBackend, LEAD_FIRST_ID } from '@/inbox/shared/flow-backend';
import { PHONE } from '@/inbox/shared/thread-fixtures';

beforeEach(resetApp);

async function openLeadChat(permissions?: string[]) {
  const { backend, log } = inboxBackend();
  const first = log[PHONE]?.[0];
  if (first) log[PHONE] = [{ ...first, replyable: true, forwardable: true }];
  if (permissions) backend.on('GET /auth/me', () => ({ role: 'admin', permissions }));
  await renderApp({ url: '/inbox', backend });
  await fireEvent.press(await screen.findByRole('button', { name: /هدى سالم/ }));
  await fireEvent(await screen.findByTestId(`bubble-${LEAD_FIRST_ID}`), 'longPress');
  return backend;
}
const inMenu = (name: string) => within(screen.getByTestId('message-menu')).getByRole('button', { name });

test('an answer goes out with the message it quotes', async () => {
  const backend = await openLeadChat();
  await fireEvent.press(inMenu(t.inbox.reply.action));
  expect(screen.getByTestId('reply-strip')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(t.inbox.composer.placeholder), 'أهلًا بك');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  await waitFor(() => expect(backend.sent('POST /threads/:phone/text')).toHaveLength(1));
  expect(backend.sent('POST /threads/:phone/text')[0]?.body).toMatchObject({ text: 'أهلًا بك', replyToMessageId: LEAD_FIRST_ID });
  await waitFor(() => expect(screen.queryByTestId('reply-strip')).toBeNull());
});

test('a forward to a chat outside its window is skipped, and the chat says why', async () => {
  const backend = await openLeadChat();
  await fireEvent.press(inMenu(t.inbox.forward.action));
  await fireEvent.press(await screen.findByRole('checkbox', { name: 'أم يوسف' }));
  expect(screen.queryByRole('checkbox', { name: 'هدى سالم' })).toBeNull(); // not into the chat it came from
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${t.inbox.forward.send} ·`) }));
  const notice = await screen.findByTestId('chat-notice');
  expect(within(notice).getByText(t.inbox.forward.result.replace('{sent}', '0').replace('{skipped}', '1'))).toBeTruthy();
  expect(within(notice).getByText(`أم يوسف: ${t.inbox.forward.skip.session_closed}`)).toBeTruthy();
  expect(backend.sent('POST /threads/forward')[0]?.body).toMatchObject({ messageId: LEAD_FIRST_ID, targets: [GUARDIAN_PHONE] });
});

test('a salesperson gets the same menu in her chat', async () => {
  await openLeadChat(['inbox.read', 'self.sales']);
  expect(inMenu(t.inbox.reply.action)).toBeTruthy();
  expect(inMenu(t.inbox.forward.action)).toBeTruthy();
});
