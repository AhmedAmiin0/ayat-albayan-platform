import { renderApp, resetApp } from '@/test/app-router';
import { routes } from '@/test/app-routes';
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
import SalesLayout from '../../../app/sales/_layout';
import SalesInboxLayout from '../../../app/sales/inbox/_layout';
import SalesInbox from '../../../app/sales/inbox/index';

// The sales tree (SalesTabs mounts useInboxRealtime): a new message reaches its «المحادثات» through
// the realtime nudge and through the poll, as the admin's (owner 2026-10-30).
Object.assign(routes, {
  'sales/_layout': SalesLayout,
  'sales/inbox/_layout': SalesInboxLayout,
  'sales/inbox/index': SalesInbox,
});

beforeEach(async () => {
  await resetApp();
  fakeRealtime();
});

async function openChats() {
  const { backend, rows } = inboxBackend();
  withOlderChat(rows);
  await renderApp({ url: '/sales/inbox', backend, gate: 'sales' });
  await screen.findByRole('button', { name: /أم يوسف/ });
  return { backend, rows };
}

test('sales: a thread_changed broadcast re-reads and redraws the chats list', async () => {
  const { backend, rows } = await openChats();
  await subscribed();
  guardianWrites(rows);
  const reads = listReads(backend);
  await broadcast(GUARDIAN_PHONE);
  await expectGuardianOnTop(backend, reads);
});

test('sales: without realtime, the next poll brings the changed first page', async () => {
  const { backend, rows } = await openChats();
  guardianWrites(rows);
  const reads = listReads(backend);
  await nextPoll();
  await expectGuardianOnTop(backend, reads);
});
