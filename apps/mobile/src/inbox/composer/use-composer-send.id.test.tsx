import { act, renderHook } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { setComposerText, useComposerText } from './draft-store';
import { useComposerSend } from './use-composer-send';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const PHONE = '+966501234567';
const ids = () => mockApiSend.mock.calls.map((c: unknown[]) => (c[2] as { clientRequestId: string }).clientRequestId);

async function setup() {
  return renderHook(
    () => {
      // The box's text lives in draft-store: a failed send puts it back there (hook-level).
      const [text, setText] = useComposerText(PHONE);
      return { ...useComposerSend({ phone: PHONE, text, setText, staged: null, clearStaged: () => undefined }), text, setText };
    },
    { wrapper: queryWrapper(createTestQueryClient()) },
  );
}

beforeEach(() => {
  mockApiSend.mockReset().mockRejectedValue(new ApiError(422, null));
  setComposerText(PHONE, 'مرحبًا');
});

test('the same text retried after a failure keeps its request id (rule 8)', async () => {
  const { result } = await setup();
  await act(async () => result.current.sendText());
  await act(async () => result.current.sendText());
  expect(ids()).toHaveLength(2);
  expect(ids()[0]).toBe(ids()[1]);
});

test('a box filled from outside after a failure (a quote, a saved reply) is a new request', async () => {
  const { result } = await setup();
  await act(async () => result.current.sendText());
  await act(async () => result.current.setText('مرحبًا\nعرض السعر'));
  await act(async () => result.current.sendText());
  expect(ids()).toHaveLength(2);
  expect(ids()[0]).not.toBe(ids()[1]);
});
