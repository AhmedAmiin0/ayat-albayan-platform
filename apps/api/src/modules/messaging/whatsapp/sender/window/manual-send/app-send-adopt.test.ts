import { describe, expect, it, vi } from 'vitest';
import { AppSendAdopt, twinOf, type HeldRow, type TwinRow } from './app-send-adopt';
import type { AppSendAdoptRepo } from './app-send-adopt.repo';
import type { ReopenCancel } from './reopen-cancel';

// The app's message stored as its own row (docs/19): the held row adopts it (one bubble).

const NOW = new Date('2026-11-06T10:00:00Z');
const held: HeldRow = {
  id: 'h1',
  phone_e164: '+966500000001',
  body: 'السلام عليكم',
  line: 'chat',
  number_id: 'n1',
  created_at: '2026-11-06T09:50:00Z',
  lead_id: null,
  dedup_key: null,
};
const twin = (over: Partial<TwinRow> = {}): TwinRow => ({
  id: 'e1',
  body: 'السلام   عليكم\n',
  line: 'chat',
  number_id: null,
  ...over,
});

describe('twinOf: the same text after folding whitespace, from the same line / number', () => {
  it('folded text and an unknown or equal origin match; the oldest first', () => {
    expect(twinOf(held, [twin(), twin({ id: 'e2' })])?.id).toBe('e1');
    expect(twinOf(held, [twin({ line: null, number_id: 'n1' })])?.id).toBe('e1');
  });

  it.each([
    ['another text', { body: 'وعليكم السلام' }],
    ['another line', { line: 'notifications' }],
    ['another number', { number_id: 'n2' }],
    ['an empty text', { body: '  ' }],
  ])('%s: none', (_name, over) => {
    expect(twinOf(held, [twin(over)])).toBeNull();
  });

  it('an empty held text never matches an empty message', () => {
    expect(twinOf({ ...held, body: ' ' }, [twin({ body: '' })])).toBeNull();
  });
});

function setup(rows: TwinRow[], adopted = true) {
  const repo = { twins: vi.fn(async () => rows), adopt: vi.fn(async () => adopted) };
  const reopens = { afterAttach: vi.fn(async () => ({ cancelled: 1 })) };
  const svc = new AppSendAdopt(
    repo as unknown as AppSendAdoptRepo,
    reopens as unknown as ReopenCancel,
  );
  return { svc, repo, reopens };
}

describe('AppSendAdopt.adopt', () => {
  it('a twin: adopted in one transaction, the reopen cancelled as on an attach', async () => {
    const { svc, repo, reopens } = setup([twin()]);
    await expect(svc.adopt(held, NOW)).resolves.toBe(true);
    expect(repo.twins).toHaveBeenCalledWith(held, NOW);
    expect(repo.adopt).toHaveBeenCalledWith(held, 'e1');
    expect(reopens.afterAttach).toHaveBeenCalledWith({ id: 'h1', phone_e164: held.phone_e164 });
  });

  it('no twin: nothing adopted', async () => {
    const { svc, repo, reopens } = setup([twin({ body: 'نص آخر' })]);
    await expect(svc.adopt(held, NOW)).resolves.toBe(false);
    expect(repo.adopt).not.toHaveBeenCalled();
    expect(reopens.afterAttach).not.toHaveBeenCalled();
  });

  it('the transaction lost its compare-and-set: false, no cancel', async () => {
    const { svc, reopens } = setup([twin()], false);
    await expect(svc.adopt(held, NOW)).resolves.toBe(false);
    expect(reopens.afterAttach).not.toHaveBeenCalled();
  });
});
