import { INBOX_LIST_REFRESH_MS, LIVE_LIST_THROTTLE_MS } from '@ab/client-core';
import type { ThreadView } from '@ab/shared';
import { act, screen, waitFor, within } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { FakeBackend } from '@/test/fake-backend';
import { GUARDIAN_PHONE } from './flow-backend';

// The chats list follows a new message (owner 2026-10-30, «the chat list is not being updated»):
// the realtime 'thread_changed' nudge and the poll, through the real tab trees (test/app-router).
// Import after '@/test/app-router': it patches that file's Supabase stub with one fake channel.

type Status = (status: string) => void;
type OnEvent = (message: { payload?: unknown }) => void;
const socket: { status?: Status; event?: OnEvent } = {};
const channel = {
  on: (_type: string, _filter: unknown, cb: OnEvent) => ((socket.event = cb), channel),
  subscribe: (cb: Status) => ((socket.status = cb), channel),
};

/** The Supabase stub gains a realtime client; the app counts as open (AppState 'active'). */
export function fakeRealtime(): void {
  const { supabase } = jest.requireMock<{ supabase: object }>('@/core/lib/http/supabase');
  Object.assign(supabase, {
    channel: () => channel,
    removeChannel: () => Promise.resolve('ok'),
    getChannels: () => [],
    realtime: { setAuth: () => Promise.resolve(), disconnect: () => Promise.resolve() },
  });
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  socket.status = undefined;
}

const advance = (ms: number) => act(() => jest.advanceTimersByTimeAsync(ms));

/** The channel joins (the resync re-reads the list once), then its throttle window passes. */
export async function subscribed(): Promise<void> {
  await waitFor(() => expect(socket.status).toBeDefined());
  await act(() => socket.status?.('SUBSCRIBED'));
  await advance(LIVE_LIST_THROTTLE_MS);
}

export async function broadcast(phone: string): Promise<void> {
  await act(() => socket.event?.({ payload: { phone } }));
}

/** No realtime: the focused chats tab's own poll. */
export const nextPoll = () => advance(INBOX_LIST_REFRESH_MS);

/** A third, older chat under the two of inboxBackend: a move to the top keeps the row count. */
export function withOlderChat(rows: ThreadView[]): void {
  const base = rows.find((r) => r.phone_e164 === GUARDIAN_PHONE);
  if (!base) throw new Error('no guardian row');
  const old = new Date(Date.now() - 72 * 3_600_000).toISOString();
  rows.push({ ...base, phone_e164: '+966501112299', display_name: 'أم سارة', last_message_at: old });
}

/** The guardian (second) writes: her chat moves to the top with a new preview and 3 unread. */
export function guardianWrites(rows: ThreadView[]): void {
  const at = rows.findIndex((r) => r.phone_e164 === GUARDIAN_PHONE);
  const row = rows[at];
  if (!row) throw new Error('no guardian row');
  const now = new Date(Date.now() + 1000).toISOString();
  rows[at] = { ...row, last_body: 'وصلت الآن', unread_count: 3, last_message_at: now };
}

/** The inset card cell around a row: its rounded top marks the list's first row. */
function roundedTop(name: RegExp): boolean {
  let node = screen.getByRole('button', { name }).parent;
  while (node && node.props.testID !== 'inset-cell') node = node.parent;
  return (node?.props.style as { borderTopLeftRadius?: number }).borderTopLeftRadius !== 0;
}

/** The chats list's own page reads so far (not the badge's pageSize=1 count). */
export const listReads = (backend: FakeBackend) =>
  backend.sent('GET /threads').filter((c) => c.query.pageSize === '25').length;

/** One more list read, and her row shows it: on top, the new preview, the count. */
export async function expectGuardianOnTop(backend: FakeBackend, reads: number): Promise<void> {
  await waitFor(() => expect(listReads(backend)).toBeGreaterThan(reads));
  const row = within(await screen.findByRole('button', { name: /أم يوسف/ }));
  await waitFor(() => expect(row.getByText(/وصلت الآن/)).toBeTruthy());
  expect(row.getByTestId('unread-count')).toHaveTextContent('3');
  expect([roundedTop(/أم يوسف/), roundedTop(/هدى سالم/)]).toEqual([true, false]);
}
