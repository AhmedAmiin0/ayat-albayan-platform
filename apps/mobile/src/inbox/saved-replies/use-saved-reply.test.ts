import { act, renderHook } from '@testing-library/react-native';
import { PRICES } from './fixtures';
import { useSavedReplyDraft } from './use-saved-reply';

const setup = () => renderHook(() => useSavedReplyDraft({ text: '', setText: jest.fn(), enabled: true }));
const OTHER = { ...PRICES, id: '5a000000-0000-4000-8000-000000000009' };

test('staging mints one clientRequestId; the same reply again keeps it, another reply gets a new one', async () => {
  const { result } = await setup();
  await act(async () => result.current.fill('x', PRICES));
  const first = result.current.staged?.requestId;
  expect(first).toMatch(/^[0-9a-f]{8}-/);
  await act(async () => result.current.fill('x', PRICES));
  expect(result.current.staged?.requestId).toBe(first);
  await act(async () => result.current.fill('x', OTHER));
  expect(result.current.staged?.replyId).toBe(OTHER.id);
  expect(result.current.staged?.requestId).not.toBe(first);
});
