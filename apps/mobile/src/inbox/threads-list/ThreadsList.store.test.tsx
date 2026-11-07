import type { ThreadView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { act } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { memoryPort } from '@/test/node-sql';
import { InboxScreen } from '@/inbox/screens/InboxScreen';
import { thread } from '@/inbox/shared/thread-fixtures';
import { storeReader } from '@/inbox/thread/local';
import { createMessageStore } from '@/inbox/thread/store/message-store';
import { applyAs, plan } from '@/inbox/thread/store/store-fixtures';

// docs/43 43-7: a list row's tick comes from the phone store too: a list answer that still says
// «sent» shows the store's ✓✓ for the same last message (the owner's pending tick, one source).

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const ours: ThreadView = { ...thread, display_name: 'أم سارة', last_status: 'sent', last_body: 'أهلًا' };
const page = (items: ThreadView[]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const row = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

afterEach(() => storeReader.detach());

test('the store’s read tick lifts a list row whose answer is still «sent»', async () => {
  mockApiFetch.mockResolvedValue(page([ours]));
  const store = createMessageStore(memoryPort().port);
  await store.open('user-a');
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم سارة');
  expect(row(t.enums.messageStatus.sent)).toBeTruthy();
  await act(async () => {
    await applyAs(store, plan([], { threads: [{ ...ours, last_status: 'read' }] }));
    storeReader.attach(store, 'user-a');
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(row(`أم سارة.*${t.enums.messageStatus.read}`)).toBeTruthy();
});

test('a stored row for another last message never changes the tick', async () => {
  mockApiFetch.mockResolvedValue(page([ours]));
  const store = createMessageStore(memoryPort().port);
  await store.open('user-a');
  const other = { ...ours, last_message_id: 'c0000000-0000-4000-8000-0000000000ff', last_status: 'read' as const };
  await applyAs(store, plan([], { threads: [other] }));
  storeReader.attach(store, 'user-a');
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم سارة');
  expect(row(`أم سارة.*${t.enums.messageStatus.sent}`)).toBeTruthy();
});
