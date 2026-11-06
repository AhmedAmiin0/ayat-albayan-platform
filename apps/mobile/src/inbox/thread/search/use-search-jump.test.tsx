import { renderHook } from '@testing-library/react-native';
import type { ReactNode, RefObject } from 'react';
import type { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ChatSearchContext, type ChatSearchValue } from './search-context';
import { useSearchJump } from './use-search-jump';

// docs/37: a hit on screen is lit; any other re-anchors with one request (`?msg=`); a close
// leaves the window.

const mockAnchorAt = jest.fn();
const mockLeave = jest.fn();
const mockMsg = jest.fn((): string | undefined => undefined);
jest.mock('@/inbox/thread/anchor', () => ({
  anchorAt: (id: string) => mockAnchorAt(id),
  leaveAnchor: () => mockLeave(),
  useAnchorParam: () => mockMsg(),
}));

const ON = 'a1111111-1111-4111-8111-111111111111';
const OFF = 'b2222222-2222-4222-8222-222222222222';

function value(id: string, closed = 0): ChatSearchValue {
  const hit = { id, created_at: '2026-10-01T00:00:00Z', snippet: 's' };
  return {
    hits: [hit],
    state: { open: true, text: 'x', index: 0 },
    closed,
  } as unknown as ChatSearchValue;
}

function run(v: ChatSearchValue) {
  const jumps = { jump: jest.fn(), cancel: jest.fn(), rows: [{ id: ON }] };
  const scrollToOffset = jest.fn();
  const list = { current: { scrollToOffset } } as unknown as RefObject<FlatList<{
    id: string;
  }> | null>;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ChatSearchContext value={v}>{children}</ChatSearchContext>
  );
  return { jumps, scrollToOffset, hook: renderHook(() => useSearchJump(list, jumps), { wrapper }) };
}

beforeEach(() => jest.clearAllMocks());

test('a hit inside the shown rows is centred and lit, no new window', async () => {
  const { jumps, hook } = run(value(ON));
  await hook;
  expect(jumps.jump).toHaveBeenCalledWith(ON, t.inbox.chatSearch.unreachable);
  expect(mockAnchorAt).not.toHaveBeenCalled();
});

test('a hit outside them re-anchors with one request', async () => {
  const { jumps, hook } = run(value(OFF));
  await hook;
  expect(mockAnchorAt).toHaveBeenCalledWith(OFF);
  expect(jumps.jump).not.toHaveBeenCalled();
});

test('a close leaves the window and goes to the newest message', async () => {
  mockMsg.mockReturnValue(OFF);
  const { jumps, scrollToOffset, hook } = run(value(ON, 1));
  await hook;
  expect(jumps.cancel).toHaveBeenCalled();
  expect(mockLeave).toHaveBeenCalled();
  expect(scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
});

test('a close on the live chat has no anchor to leave', async () => {
  mockMsg.mockReturnValue(undefined);
  const { hook } = run(value(ON, 1));
  await hook;
  expect(mockLeave).not.toHaveBeenCalled();
});
