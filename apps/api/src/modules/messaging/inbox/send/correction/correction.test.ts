import { describe, expect, it, vi } from 'vitest';
import { checkTarget, correctionOf } from './correction';
import type { CorrectionRepo } from './correction.repo';
import { target } from './correction.fakes';
import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';

const ORIGINAL = 'a0000000-0000-4000-8000-0000000000c1';
const send = (over: object = {}) => ({
  phone: PHONE,
  actorId: 'u1',
  role: 'sales',
  input: { text: 'نص جديد', correctsId: ORIGINAL },
  ...over,
});
const repoOf = (row = target({ created_by: 'u1' })) =>
  ({ target: vi.fn(async () => row) }) as unknown as CorrectionRepo;
const code = (run: () => unknown): unknown => {
  try {
    run();
  } catch (e) {
    return (e as { getResponse: () => { code: string } }).getResponse().code;
  }
  return null;
};

describe('correctionOf', () => {
  it('without correctsId: the send as it is, no read, no link', async () => {
    const repo = repoOf();
    const s = send({ input: { text: 'نص' } });
    expect(await correctionOf(repo, s)).toEqual({ send: s, row: {} });
    expect(repo.target).not.toHaveBeenCalled();
  });

  it('prefixes the text, replies to the original and links it; the original is only read', async () => {
    const repo = repoOf();
    const out = await correctionOf(repo, send());
    expect(out.send.input).toMatchObject({ text: 'تصحيح: نص جديد', replyToMessageId: ORIGINAL });
    expect(out.row).toEqual({ corrects_id: ORIGINAL });
    expect(Object.keys(repo)).toEqual(['target']);
  });
});

describe('checkTarget: who may correct what', () => {
  it('the author, or an admin', () => {
    expect(code(() => checkTarget(target({ created_by: 'u1' }), send()))).toBeNull();
    expect(code(() => checkTarget(target({ created_by: 'x' }), send({ role: 'admin' })))).toBeNull();
    expect(code(() => checkTarget(target({ created_by: 'x' }), send()))).toBe('not_your_message');
    expect(code(() => checkTarget(target({ created_by: null }), send()))).toBe('not_your_message');
  });

  it.each([
    ['inbound', { direction: 'inbound' }],
    ['failed', { status: 'failed' }],
    ['no wamid yet', { wa_message_id: null }],
    ['deleted', { deleted_at: '2026-11-07T08:00:00Z' }],
    ['a marker', { interactive_payload: { type: 'reaction' } }],
  ])('refuses %s: not_correctable', (_, over) => {
    expect(code(() => checkTarget(target({ created_by: 'u1', ...over }), send()))).toBe(
      'not_correctable',
    );
  });
});
