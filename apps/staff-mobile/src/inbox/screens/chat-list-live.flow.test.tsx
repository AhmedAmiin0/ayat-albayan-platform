import { renderApp, resetApp } from '@/test/app-router';
import { screen } from '@testing-library/react-native';
import { GUARDIAN_PHONE, inboxBackend } from '@/inbox/shared/flow-backend';
import {
  broadcast,
  expectGuardianOnTop,
  fakeRealtime,
  guardianWrites,
  listReads,
  nextPoll,
  subscribed,
  withOlderChat,
} from '@/inbox/shared/chat-list-live.helpers';

// The admin tree ((tabs)/_layout mounts useInboxRealtime): a new message reaches «المحادثات»
// through the realtime nudge and through the poll (owner 2026-10-30).

beforeEach(async () => {
  await resetApp();
  fakeRealtime();
});

async function openChats() {
  const { backend, rows } = inboxBackend();
  withOlderChat(rows);
  await renderApp({ url: '/inbox', backend });
  await screen.findByRole('button', { name: /أم يوسف/ });
  return { backend, rows };
}

test('admin: a thread_changed broadcast re-reads and redraws the chats list', async () => {
  const { backend, rows } = await openChats();
  await subscribed();
  guardianWrites(rows);
  const reads = listReads(backend);
  await broadcast(GUARDIAN_PHONE);
  await expectGuardianOnTop(backend, reads);
});

test('admin: without realtime, the next poll brings the changed first page', async () => {
  const { backend, rows } = await openChats();
  guardianWrites(rows);
  const reads = listReads(backend);
  await nextPoll();
  await expectGuardianOnTop(backend, reads);
});
