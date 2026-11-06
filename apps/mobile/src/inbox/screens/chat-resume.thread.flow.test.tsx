import { renderApp, resetApp } from '@/test/app-router';
import { THREAD_FULL_MS } from '@ab/client-core';
import { act, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { READ_TIMEOUT_MS } from '@ab/client-core';
import { native } from '@/test/native-mocks';
import { GUARDIAN_PHONE, inboxBackend } from '@/inbox/shared/flow-backend';
import { message } from '@/inbox/shared/thread-fixtures';
import {
  backgroundThenActive,
  captureAppState,
  isThreadRead,
  pushArrives,
  pushTapped,
  stallReads,
} from '@/test/app-resume';

// Owner 2026-11-05: the open chat (or one a push tap opens) showed the saved copy, not the new
// message. A chat read stuck on a dead connection was joined by every refresh and by a new mount.

const NEW = 'وصلت رسالتي الجديدة';

beforeEach(async () => {
  jest.useFakeTimers({ advanceTimers: true });
  await resetApp();
  captureAppState();
  native.isDevice = true;
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const tap = () => act(async () => native.listeners.response?.(pushTapped(GUARDIAN_PHONE)));

async function openChat() {
  const { backend, log } = inboxBackend();
  await renderApp({ url: '/inbox', backend });
  await screen.findByRole('button', { name: /أم يوسف/ });
  await tap();
  await screen.findByText('هل الحلقة بكرة؟');
  const stall = stallReads(backend, isThreadRead(GUARDIAN_PHONE));
  // A push re-reads the chat; that read hangs (the connection died under it).
  await act(async () => native.listeners.received?.(pushArrives(GUARDIAN_PHONE)));
  expect(stall.stalled.length).toBeGreaterThan(0);
  const writes = () => {
    const row = message({ id: 'g2', phone_e164: GUARDIAN_PHONE, direction: 'inbound', body: NEW });
    log[GUARDIAN_PHONE] = [...(log[GUARDIAN_PHONE] ?? []), row];
  };
  return { backend, stall, writes };
}

test('the open chat whose read hangs across the background shows the new message on return', async () => {
  const { stall, writes } = await openChat();
  writes();
  stall.release();
  await backgroundThenActive();
  expect(await screen.findByText(NEW)).toBeTruthy();
});

test('the 20 s deadline ends the stuck read, then the next read shows the new bubble', async () => {
  const { stall, writes } = await openChat();
  writes();
  stall.release();
  await act(() => jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS));
  await act(() => jest.advanceTimersByTimeAsync(THREAD_FULL_MS));
  expect(await screen.findByText(NEW)).toBeTruthy();
});

test('a closed chat with a stuck read: a push tap opens it with the new message at once', async () => {
  const { stall, writes } = await openChat();
  await act(async () => router.back()); // the chat closes; its read is dropped with it
  writes();
  stall.release();
  await tap();
  expect(await screen.findByText(NEW)).toBeTruthy();
});
