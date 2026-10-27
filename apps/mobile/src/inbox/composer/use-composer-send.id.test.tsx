import { act, renderHook } from '@testing-library/react-native';
import { useState } from 'react';
import { ApiError } from '@/core/lib/http/api';
import { createTestQueryClient, queryWrapper } from '@/test/query';
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
      const [text, setText] = useState('مرحبًا');
      return { ...useComposerSend({ phone: PHONE, text, setText, staged: null, clearStaged: () => undefined }), text, setText };
    },
    { wrapper: queryWrapper(createTestQueryClient()) },
  );
}

beforeEach(() => mockApiSend.mockReset().mockRejectedValue(new ApiError(500, null)));

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
