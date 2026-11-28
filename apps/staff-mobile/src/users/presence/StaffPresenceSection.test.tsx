import { presenceRoutes } from '@ab/shared';
import type { StaffPresenceRow } from '@ab/shared';
import { act, screen, waitFor, within } from '@testing-library/react-native';
import { t, pathKey } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { realtime } from '@ab/testing/presence-realtime';
import { fullAccessMe } from '@/test/staff-me';
import { StaffPresenceSection } from './StaffPresenceSection';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('@ab/mobile-kit/lib/http/supabase', () =>
  jest.requireActual('@ab/testing/presence-realtime').realtime.module(),
);

const p = t.presence;
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const row = (id: string, last: string | null): StaffPresenceRow => ({
  profile_id: id,
  name: `اسم ${id}`,
  role: 'teacher',
  last_seen_at: last,
});

beforeEach(() => {
  mockApi.reset('read');
  realtime.reset();
});

test('loading: the title and a spinner', async () => {
  mockApi.onRead(() => new Promise(() => undefined));
  await renderWithQuery(<StaffPresenceSection />);
  expect(screen.getByText(p.staffTitle)).toBeTruthy();
  expect(screen.getByLabelText(t.common.loading)).toBeTruthy();
});

test('a failed read says so', async () => {
  mockApi.onRead(() => Promise.reject(new Error('down')));
  await renderWithQuery(<StaffPresenceSection />);
  expect(await screen.findByText(p.loadError)).toBeTruthy();
});

test('presence off says so', async () => {
  mockApi.onRead(() => ({ enabled: false, staff: [] }));
  await renderWithQuery(<StaffPresenceSection />);
  expect(await screen.findByText(p.off)).toBeTruthy();
});

test('no staff yet says so', async () => {
  mockApi.onRead(() => ({ enabled: true, staff: [] }));
  await renderWithQuery(<StaffPresenceSection />);
  expect(await screen.findByText(p.staffEmpty)).toBeTruthy();
});

test('online first, then newest last seen, never seen last; «متصلون الآن: 1»', async () => {
  const staff = [row('a', ago(30)), row('b', null), row('c', ago(5)), row('d', ago(50))];
  mockApi.onRead(() => ({ enabled: true, staff }));
  await renderWithQuery(<StaffPresenceSection />);
  expect(await screen.findByText('اسم a', { exact: false })).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: presenceRoutes.staff.path });
  await waitFor(() => expect(realtime.isOpen('d')).toBe(true));
  await act(async () => {
    realtime.joinAll();
    realtime.present('d');
  });
  await waitFor(() => expect(screen.getByText(p.staffOnline.replace('{n}', '1'))).toBeTruthy());
  const ids = screen.getAllByTestId(/^staff-presence-/).map((r) => r.props.testID as string);
  expect(ids).toEqual([
    'staff-presence-d',
    'staff-presence-c',
    'staff-presence-a',
    'staff-presence-b',
  ]);
  const online = screen.getByTestId('staff-presence-d');
  expect(within(online).getByText(p.online)).toBeTruthy();
  expect(within(online).getByTestId('presence-dot')).toBeTruthy();
  expect(within(screen.getByTestId('staff-presence-b')).getByText(p.staffNever)).toBeTruthy();
  const when = p.minutes.few.replace('{n}', '5');
  const seen = within(screen.getByTestId('staff-presence-c'));
  expect(seen.getByText(p.lastSeen.replace('{when}', when))).toBeTruthy();
});

test('not a base-role admin: no section, no request', async () => {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), fullAccessMe('assistant'));
  await renderWithQuery(<StaffPresenceSection />, client);
  expect(screen.queryByTestId('staff-presence')).toBeNull();
  expect(mockApi.reads()).toHaveLength(0);
});
