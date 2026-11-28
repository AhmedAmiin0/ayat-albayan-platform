import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { proposalDecisionCalls, teacherProposalCalls } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const AT = '2026-10-06T15:30:00.000Z';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('proposalDecisionCalls (R-SCH-08)', () => {
  it('reads the pending lessons', async () => {
    const { client, apiFetch } = clientAnswering([]);
    await expect(proposalDecisionCalls(client).pending()).resolves.toEqual([]);
    expect(apiFetch).toHaveBeenCalledWith('/lesson-proposals');
  });

  it('refuses a pending answer that is not a list', async () => {
    const { client } = clientAnswering({});
    await expect(proposalDecisionCalls(client).pending()).rejects.toThrow();
  });

  it('approves with the override reason as the body', async () => {
    const { client, apiSend } = clientAnswering(null);
    const body = { override: { reason: 'ولي الأمر موافق' } };
    await expect(proposalDecisionCalls(client).approve({ id: ID }, body)).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('POST', `/lesson-proposals/${ID}/approve`, body);
  });

  it('rejects with the note the family reads', async () => {
    const { client, apiSend } = clientAnswering(null);
    const body = { note: 'لا يتوفر وقت' };
    await expect(proposalDecisionCalls(client).reject({ id: ID }, body)).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('POST', `/lesson-proposals/${ID}/reject`, body);
  });
});

describe('teacherProposalCalls (R-SCH-08)', () => {
  it('proposes a new start for the lesson', async () => {
    const { client, apiSend } = clientAnswering({ id: 'x' });
    const body = { startsAt: AT, note: 'ظرف' };
    await expect(teacherProposalCalls(client).propose({ id: ID }, body)).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${ID}/propose`, body);
  });
});
