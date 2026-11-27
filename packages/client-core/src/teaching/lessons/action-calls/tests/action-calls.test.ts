import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { lessonActionCalls } from '..';

const LESSON = '00000000-0000-4000-8000-000000000001';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('lessonActionCalls (R-SCH-03, R-SCH-07, R-SCH-08)', () => {
  it('confirms the lesson by its id, without a body', async () => {
    const { client, apiSend } = clientAnswering({ id: 'x' });
    await expect(lessonActionCalls(client).confirm({ id: LESSON })).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${LESSON}/confirm`, undefined);
  });

  it('sends the outcome as the body', async () => {
    const { client, apiSend } = clientAnswering(null);
    const body = { event: 'complete' } as const;
    await expect(lessonActionCalls(client).status({ id: LESSON }, body)).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${LESSON}/status`, body);
  });

  it('cancels and answers the cancelled lessons', async () => {
    const { client, apiSend } = clientAnswering([]);
    const body = { scope: 'rule', by: 'admin', reason: 'سفر' } as const;
    await expect(lessonActionCalls(client).cancel({ id: LESSON }, body)).resolves.toEqual([]);
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${LESSON}/cancel`, body);
  });

  it('refuses a cancel answer that is not a list', async () => {
    const { client } = clientAnswering({});
    const body = { scope: 'one', by: 'teacher', reason: 'سفر' } as const;
    await expect(lessonActionCalls(client).cancel({ id: LESSON }, body)).rejects.toThrow();
  });
});
