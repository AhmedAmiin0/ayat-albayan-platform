import { act, renderHook } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import * as ownSend from '@/inbox/thread/anchor/own-send';
import { useSendStagedFile } from './send-staged';
import type { StagedFile } from './use-saved-reply';

// A saved reply's file counts as a send from this device: an anchored chat goes back to live
// (docs/37).

const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

test('staging then sending the file marks a send in that chat', async () => {
  const sends = jest.spyOn(ownSend, 'markOwnSend');
  mockApiSend.mockResolvedValueOnce({ path: 'p/1.pdf', filename: '1.pdf' });
  mockApiSend.mockResolvedValueOnce(message({ id: 'c1111111-1111-4111-8111-111111111111', status: 'queued' }));
  const wrapper = queryWrapper(createTestQueryClient());
  const { result } = await renderHook(() => useSendStagedFile(PHONE), { wrapper });
  const file = { name: '1.pdf', mime: 'application/pdf', size: 1 } as const;
  const staged: StagedFile = { replyId: 'r1', requestId: 'q1', file };
  await act(() => result.current.mutateAsync(staged));
  expect(sends).toHaveBeenCalledWith(PHONE);
});
