import { renderApp, resetApp } from '@/test/app-router';
import { act, screen } from '@testing-library/react-native';
import { supabase } from '@/core/lib/http/supabase';
import { READ_TIMEOUT_MS } from '@ab/client-core';
import { inboxBackend } from '@/inbox/shared/flow-backend';
import {
  expectGuardianOnTop,
  guardianWrites,
  listReads,
  nextPoll,
  withOlderChat,
} from '@/inbox/shared/chat-list-live.helpers';
import {
  backgroundThenActive,
  captureAppState,
  isListRead,
  stallReads,
} from '@/test/app-resume';

// Owner 2026-11-05 (production APK): back in the app after a push, «المحادثات» still showed the
// old list. A list read stuck across the background (a dead connection, a token refresh that
// hangs) was joined by every refresh. Now the return cancels and re-reads it, and no read
// outlives its deadline.

const getSession = jest.mocked(supabase.auth.getSession);
const never = () => new Promise<never>(() => undefined);

beforeEach(async () => {
  jest.useFakeTimers({ advanceTimers: true });
  await resetApp();
  captureAppState();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openChats() {
  const { backend, rows } = inboxBackend();
  withOlderChat(rows);
  await renderApp({ url: '/inbox', backend });
  await screen.findByRole('button', { name: /أم يوسف/ });
  return { backend, rows };
}

test('a list read stuck across the background is re-read on return: the new chat is on top', async () => {
  const { backend, rows } = await openChats();
  const stall = stallReads(backend, isListRead);
  await nextPoll();
  expect(stall.stalled.length).toBeGreaterThan(0);
  guardianWrites(rows);
  stall.release();
  const reads = listReads(backend);
  await backgroundThenActive();
  await expectGuardianOnTop(backend, reads);
});

test('getSession() hangs across background → active: the list updates after the deadline', async () => {
  const { backend, rows } = await openChats();
  getSession.mockImplementation(never);
  guardianWrites(rows);
  const reads = listReads(backend);
  await backgroundThenActive();
  await nextPoll();
  expect(listReads(backend)).toBe(reads); // every read waits for the token
  getSession.mockResolvedValue({ data: { session: null }, error: null });
  await act(() => jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS));
  await nextPoll();
  await expectGuardianOnTop(backend, reads);
});

test('a never-loaded list whose first read hangs shows the chats after a return', async () => {
  const { backend, rows } = inboxBackend();
  withOlderChat(rows);
  const stall = stallReads(backend, isListRead);
  await renderApp({ url: '/inbox', backend });
  expect(screen.queryByRole('button', { name: /أم يوسف/ })).toBeNull();
  guardianWrites(rows);
  stall.release();
  await backgroundThenActive();
  await expectGuardianOnTop(backend, 0);
});

test('a never-loaded list whose first read hangs reads again after the deadline', async () => {
  const { backend, rows } = inboxBackend();
  withOlderChat(rows);
  const stall = stallReads(backend, isListRead);
  await renderApp({ url: '/inbox', backend });
  guardianWrites(rows);
  stall.release();
  await act(() => jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS));
  await nextPoll();
  await expectGuardianOnTop(backend, 0);
});
