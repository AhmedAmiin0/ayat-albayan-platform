import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { PRICES } from '../saved-replies/testing/fixtures';
import type { StagedFile } from '../saved-replies/hooks/use-saved-reply';
import { message } from '../shared/thread-fixtures';
import { useComposerSend } from './use-composer-send';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const PHONE = '+966552147730';
const file = (id: string): StagedFile => ({ replyId: PRICES.id, file: { name: 'الأسعار.pdf', mime: 'application/pdf', size: 1 }, requestId: id });
const pathsOf = () => mockApiSend.mock.calls.map((c: unknown[]) => c[1] as string);
const stageIds = () =>
  mockApiSend.mock.calls.filter((c: unknown[]) => String(c[1]).endsWith('/stage')).map((c: unknown[]) => (c[2] as { clientRequestId: string }).clientRequestId);

/** The text answer waits for `release()`; the stage and file answers come at once. */
function holdText() {
  let release: () => void = () => undefined;
  mockApiSend.mockImplementation((_m: string, path: string) => {
    if (path.endsWith('/stage')) return Promise.resolve({ path: 'out/x.pdf', filename: 'الأسعار.pdf' });
    if (path.endsWith('/file')) return Promise.resolve(message({ id: 'f1', status: 'queued' }));
    return new Promise((resolve) => (release = () => resolve(message({ id: 't1', status: 'queued' }))));
  });
  return () => release();
}

function setup(initial: StagedFile | null, text = '') {
  return renderHook(
    () => {
      const [box, setText] = useState(text);
      const [staged, setStaged] = useState(initial);
      const api = useComposerSend({ phone: PHONE, text: box, setText, staged, clearStaged: () => setStaged(null) });
      return { ...api, staged, setStaged };
    },
    { wrapper: queryWrapper(createTestQueryClient()) },
  );
}

beforeEach(() => mockApiSend.mockReset());

test('a retry of a failed staged file re-sends the clientRequestId minted when it was staged', async () => {
  mockApiSend.mockRejectedValueOnce(new Error('502')).mockImplementation((_m: string, path: string) =>
    Promise.resolve(path.endsWith('/stage') ? { path: 'out/x.pdf', filename: 'الأسعار.pdf' } : message({ id: 'f1', status: 'queued' })),
  );
  const { result } = await setup(file('stage-1'));
  await act(() => result.current.sendText());
  await waitFor(() => expect(result.current.errors[1]).not.toBeNull());
  expect(result.current.staged).not.toBeNull();
  await act(() => result.current.sendText());
  await waitFor(() => expect(result.current.staged).toBeNull());
  expect(stageIds()).toEqual(['stage-1', 'stage-1']);
});

test('«أرسل» is pending while the text is in flight: a second tap sends nothing more', async () => {
  const release = holdText();
  const { result } = await setup(file('stage-1'), 'السلام عليكم');
  await act(() => result.current.sendText());
  await waitFor(() => expect(result.current.pending).toBe(true));
  await act(() => result.current.sendText());
  expect(pathsOf()).toEqual(['/threads/%2B966552147730/text']);
  await act(async () => release());
  await waitFor(() => expect(result.current.staged).toBeNull());
  expect(pathsOf()).toEqual(['/threads/%2B966552147730/text', `/saved-replies/${PRICES.id}/stage`, '/threads/%2B966552147730/file']);
  expect(result.current.pending).toBe(false);
});

test('the chip removed while the text is in flight: the file is not sent', async () => {
  const release = holdText();
  const { result } = await setup(file('stage-1'), 'السلام عليكم');
  await act(() => result.current.sendText());
  await act(async () => result.current.setStaged(null));
  await act(async () => release());
  await waitFor(() => expect(result.current.pending).toBe(false));
  expect(pathsOf()).toEqual(['/threads/%2B966552147730/text']);
});

test('another reply staged while the text is in flight: neither file goes and the new chip stays', async () => {
  const release = holdText();
  const { result } = await setup(file('stage-1'), 'السلام عليكم');
  await act(() => result.current.sendText());
  await act(async () => result.current.setStaged(file('stage-2')));
  await act(async () => release());
  await waitFor(() => expect(result.current.pending).toBe(false));
  expect(pathsOf()).toEqual(['/threads/%2B966552147730/text']);
  expect(result.current.staged?.requestId).toBe('stage-2');
});
