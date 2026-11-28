import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { ChannelPage } from '@ab/shared';
import { AppState } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../../../testing/query';
import { ChannelThread } from '../ChannelThread';
import { channelMessage, channelPage } from '../../testing/channel-fixtures';
import { mockCall } from '@ab/testing/mock-call';

// Read marks only while the thread is seen (focused and the app in the foreground).
const mockApi = mockCall();
jest.mock('../../../lib/http/api', () => ({
  ...jest.requireActual('../../../lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const c = t.studentChannel;
const READ_PATH = '/teachers/me/channels/s1/read';
const page = channelPage({
  messages: [
    channelMessage({ id: 'm1', body: 'قديمة', created_at: '2026-10-27T09:00:00.000Z' }),
    channelMessage({ id: 'm2', body: 'جديدة', created_at: '2026-10-27T10:00:00.000Z' }),
    channelMessage({
      ...{ id: 'm3', body: 'ردّي', mine: true, read_by_all: false },
      ...{ sender_role: 'teacher', created_at: '2026-10-27T10:05:00.000Z' },
    }),
  ],
});
const reads = {
  read: [{ name: 'أم سلمى', role: 'guardian', at: '2026-10-27T10:06:00.000Z' }],
  unread: [{ name: 'سلمى', role: 'student' }],
};

beforeEach(() => {
  mockApi.reset('read');
  mockApi.onRead(async ({ path }) => (path.endsWith('/reads') ? reads : page));
  mockApi.reset('write');
  mockApi.onWrite(() => ({}));
});

const open = () =>
  renderWithQuery(
    <ChannelThread refs={{ audience: 'teacher', studentId: 's1' }} />,
    freshQueryClient(),
  );

test('a long press on my ticks: who read it (with the time) and who not yet', async () => {
  await open();
  await fireEvent(await screen.findByTestId('ticks-sent'), 'longPress');
  expect(await screen.findByText(`أم سلمى · ${c.roles.guardian}`)).toBeTruthy();
  expect(screen.getByText(`سلمى · ${c.roles.student}`)).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/teachers/me/channels/s1/messages/m3/reads',
  });
});

test('the band sits over the first message after the page’s mark, and the mark moves on', async () => {
  const marked = { ...page, my_last_read_at: '2026-10-27T09:30:00.000Z' };
  mockApi.onRead(async ({ path }) => (path.endsWith('/reads') ? reads : marked));
  const client = freshQueryClient();
  await renderWithQuery(<ChannelThread refs={{ audience: 'teacher', studentId: 's1' }} />, client);
  expect(await screen.findByText(c.unread.replace('{n}', '1'))).toBeTruthy();
  const at = '2026-10-27T10:05:00.000Z';
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({ method: 'POST', path: READ_PATH, body: { at } }),
  );
  // A refetch brings the moved mark: the band stays where it was when the chat opened.
  mockApi.onRead(() => ({ ...marked, my_last_read_at: at }));
  await act(() => client.invalidateQueries());
  expect(screen.getByText(c.unread.replace('{n}', '1'))).toBeTruthy();
});

test('no mark yet (never read, or a monitor): no band', async () => {
  await open();
  expect(await screen.findByText('جديدة')).toBeTruthy();
  expect(screen.queryByText(c.unread.replace('{n}', '2'))).toBeNull();
});

test('in the background the thread is not marked read', async () => {
  const listeners: ((s: string) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, fn) => {
    listeners.push(fn as (s: string) => void);
    return { remove: () => undefined };
  });
  Object.defineProperty(AppState, 'currentState', { value: 'background', configurable: true });
  await open();
  expect(await screen.findByText('جديدة')).toBeTruthy();
  expect(mockApi.writes()).toHaveLength(0);
  await act(async () => listeners.forEach((fn) => fn('active')));
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: READ_PATH,
      body: expect.anything(),
    }),
  );
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
});

describe('the owning assistant (sales): a monitor on a closed chat', () => {
  const SALES_READ = '/sales/students/s1/channel/read';
  const asSales = async (over: Partial<ChannelPage>) => {
    mockApi.onRead(async ({ path }) => (path.endsWith('/reads') ? reads : { ...page, ...over }));
    const refs = { audience: 'sales', studentId: 's1' } as const;
    await renderWithQuery(<ChannelThread refs={refs} />, freshQueryClient());
    await waitFor(() => expect(mockApi.reads()).not.toHaveLength(0));
    await act(async () => undefined);
  };

  test.each([
    { open: false, read_only: true },
    { open: false, read_only: false },
  ])('a closed chat never calls the read endpoint (%o)', async (over) => {
    await asSales(over);
    expect(mockApi.writes()).not.toContainEqual({
      method: 'POST',
      path: SALES_READ,
      body: expect.anything(),
    });
  });

  test('an open chat marks it read up to the newest message', async () => {
    await asSales({ open: true, read_only: false });
    const at = '2026-10-27T10:05:00.000Z';
    await waitFor(() =>
      expect(mockApi.writes()).toContainEqual({ method: 'POST', path: SALES_READ, body: { at } }),
    );
  });
});
