import { createTestQueryClient } from '@/test/query';
import { PHONE } from '@/inbox/shared/thread-fixtures';
import { threadListKey } from './inbox-sync';
import { resumeInbox } from './inbox-resume';
import { threadKey } from './thread-cache';
import { threadPollKey } from './thread-poll';
import { threadKeys } from '@/core/lib/keys';

// Back in the foreground (docs/43 AU3): the open chat's newest page and the shown lists' page 1,
// merged; every other inbox query only marked stale (it reads when it shows), never all re-read.

const mockNudge = jest.fn();
jest.mock('@/inbox/thread/local/store-session', () => ({ nudgeInboxStore: () => mockNudge() }));

test('resume cancels stuck reads, re-reads the open chat newest page, marks the rest stale', async () => {
  const client = createTestQueryClient();
  const cancel = jest.spyOn(client, 'cancelQueries');
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  await resumeInbox(client);
  expect(cancel).toHaveBeenCalledWith({ queryKey: threadKeys.all });
  expect(mockNudge).toHaveBeenCalled();
  expect(refetch).toHaveBeenCalledWith({ queryKey: threadPollKey(PHONE).slice(0, 1), type: 'active' });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: threadKeys.all, refetchType: 'none' });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: threadListKey, refetchType: 'none' });
  const reread = invalidate.mock.calls.filter(([f]) => f?.refetchType !== 'none');
  const keys = reread.map(([f]) => f?.queryKey);
  expect(keys).not.toContainEqual(threadKeys.all);
  expect(keys).not.toContainEqual(threadKey(PHONE));
});
