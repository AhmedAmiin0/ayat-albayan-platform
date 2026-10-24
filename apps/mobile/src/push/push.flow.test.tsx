import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { native } from '@/test/native-mocks';
import { GUARDIAN_PHONE } from '@/inbox/flow-backend';
import { pushBackend } from './flow-backend';
import { TOKEN_KEY } from './registerPush';

// Jest has no EAS config; registerPush needs the linked project's id.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: 'test', extra: { eas: { projectId: 'proj-flow' } } } },
}));

const TOKEN = 'ExponentPushToken[flow]';
// The inbox has an unread thread: the tab's name carries its count («المحادثات، 1 غير مقروءة»).
const inboxTab = new RegExp(`^${t.nav.conversations}`);
const tap = (data: Record<string, unknown>) => ({ notification: { request: { content: { data } } } });

beforeEach(async () => {
  await resetApp();
  native.isDevice = true;
});

const fire = (data: Record<string, unknown>) =>
  act(async () => native.listeners.response?.(tap(data)));

test('admin tabs mount → the token is PUT once and kept on disk; the tab bar is up', async () => {
  const { backend, tokens } = pushBackend();
  await renderApp({ url: '/', backend });
  await waitFor(() => expect(backend.sent('PUT /me/push-tokens')).toHaveLength(1));
  expect(backend.sent('PUT /me/push-tokens')[0]?.body).toEqual({ token: TOKEN });
  await act(async () => undefined); // registerPush stores the token right after the PUT answers
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
  expect(tokens).toEqual([TOKEN]);
  expect(screen.getByRole('button', { name: inboxTab })).toBeTruthy();
});

test('a tapped push opens its screen: a message → that thread, a payment due → that student', async () => {
  const { backend } = pushBackend();
  const app = await renderApp({ url: '/', backend });
  await waitFor(() => expect(native.listeners.response).toBeDefined());

  await fire({ kind: 'new_message', phone: GUARDIAN_PHONE });
  expect(await screen.findByText('هل الحلقة بكرة؟')).toBeTruthy();
  expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`);

  await fire({ kind: 'payment_due', studentId: 's9' });
  expect(await screen.findByText(t.subscriptions.empty)).toBeTruthy();
  expect(app.pathname()).toBe('/students/s9');
  expect(backend.sent('GET /students/:id').at(-1)?.path).toBe('/students/s9');
});

test('the tap that started the app opens its thread at boot; a push that is not ours stays put', async () => {
  const { backend } = pushBackend();
  native.lastResponse = tap({ kind: 'new_message', phone: GUARDIAN_PHONE });
  const app = await renderApp({ url: '/', backend });
  expect(await screen.findByText('هل الحلقة بكرة؟')).toBeTruthy();
  expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`);
  await fire({ kind: 'promo' });
  expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`);
});

test('no Firebase (the token fetch rejects): no PUT, nothing stored, and the app still works', async () => {
  const { backend } = pushBackend();
  native.token = new Error('FirebaseApp is not initialized');
  const app = await renderApp({ url: '/', backend });
  await fireEvent.press(screen.getByRole('button', { name: inboxTab }));
  expect(app.pathname()).toBe('/inbox');
  expect(await screen.findByRole('button', { name: /أم يوسف/ })).toBeTruthy();
  expect(backend.sent('PUT /me/push-tokens')).toHaveLength(0);
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
});

test('sign out from «المزيد»: this device’s token is DELETEd first, then the session ends → /login', async () => {
  const { backend, tokens } = pushBackend();
  let signOutsAtDelete = -1;
  backend.on('DELETE /me/push-tokens/:token', () => {
    signOutsAtDelete = jest.mocked(supabase.auth.signOut).mock.calls.length;
    tokens.length = 0;
  });
  const app = await renderApp({ url: '/', backend });
  await waitFor(() => expect(tokens).toEqual([TOKEN]));
  await act(async () => undefined);
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.more }));
  await fireEvent.press(await screen.findByRole('button', { name: t.auth.logout }));

  await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalledTimes(1));
  await app.setGate('out'); // the auth listener's job: the gate follows the session
  await waitFor(() => expect(app.pathname()).toBe('/login'));
  expect(backend.sent('DELETE /me/push-tokens/:token')[0]?.path).toBe(
    `/me/push-tokens/${encodeURIComponent(TOKEN)}`,
  );
  expect(signOutsAtDelete).toBe(0);
  expect(tokens).toEqual([]);
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
});
