import { renderHook } from '@testing-library/react-native';
import type { GateStatus } from '@ab/mobile-kit';
import { clearInboxOnSignOut } from '@/inbox';
import { useClearInboxOnSignOut } from '@/core/root/use-clear-inbox-on-sign-out';

jest.mock('@/inbox', () => ({ clearInboxOnSignOut: jest.fn() }));
const clear = jest.mocked(clearInboxOnSignOut);

beforeEach(() => clear.mockClear());

test('signing out clears the inbox drafts and message store', async () => {
  const hook = await renderHook((gate: GateStatus) => useClearInboxOnSignOut(gate), {
    initialProps: 'admin',
  });
  expect(clear).not.toHaveBeenCalled();
  await hook.rerender('out');
  expect(clear).toHaveBeenCalledTimes(1);
});

test('a signed-in or booting session keeps them', async () => {
  const hook = await renderHook((gate: GateStatus) => useClearInboxOnSignOut(gate), {
    initialProps: 'booting',
  });
  await hook.rerender('teacher');
  expect(clear).not.toHaveBeenCalled();
});
