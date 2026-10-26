import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '../../../../common/integrations/numbers-overlay';
import { fakeQueries } from '../webhook.fakes';
import { catchUpSince, ExternalCatchUpJob, FLOOR, LOOKBACK_MS, MAX_PAGES } from './external-catchup.job';
import { externalServices, KAPSO_NUMBER_ID, kapsoOverlay, kapsoText, SENT_AT, SENT_TS } from './external.fakes';
import type { ExternalQueries } from './external.queries';
import type { KapsoHistory } from './kapso-history';

const NOW = new Date('2026-10-26T12:00:00Z');

function job() {
  const queries = fakeQueries();
  const x = externalServices(queries);
  const j = new ExternalCatchUpJob(x.ext as unknown as ExternalQueries, x.store, x.kapso as unknown as KapsoHistory);
  return { ...x, queries, job: j };
}
const page = (messages: unknown[], after?: string) => ({ messages, after });

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.restoreAllMocks();
});

describe('catchUpSince', () => {
  it('first run (only the import, or nothing) → the newest external message, never before 2026-10-25', () => {
    expect(catchUpSince(null, NOW)).toEqual(FLOOR);
    const imported = new Date('2026-10-25T00:54:00Z');
    expect(catchUpSince(imported, NOW)).toEqual(imported);
    expect(catchUpSince(new Date('2026-10-01T00:00:00Z'), NOW)).toEqual(FLOOR);
  });

  it('a recent newest one still re-reads the last day (a missed fetch is older than it)', () => {
    expect(catchUpSince(new Date(NOW.getTime() - 60_000), NOW)).toEqual(new Date(NOW.getTime() - LOOKBACK_MS));
  });
});

describe('ExternalCatchUpJob', () => {
  it('inserts only the missing messages, oldest first, linked to the number', async () => {
    const x = job();
    x.queries.stored.push({ direction: 'outbound', phone_e164: '+966501234567', wa_message_id: 'wamid.HAVE' });
    const newer = kapsoText({ id: 'wamid.NEW2', timestamp: String(Number(SENT_TS) + 5) });
    x.kapso.outbound.mockResolvedValueOnce(page([newer, kapsoText({ id: 'wamid.HAVE' }), kapsoText({ id: 'wamid.NEW1' })]));
    const [counts] = await x.job.runOnce(NOW);
    expect(counts).toEqual({ listed: 3, stored: 2, known: 1, skipped: 0 });
    expect(x.queries.stored.map((r) => r.wa_message_id)).toEqual(['wamid.HAVE', 'wamid.NEW1', 'wamid.NEW2']);
    expect(x.queries.stored[1]).toMatchObject({ created_at: SENT_AT.toISOString(), created_by: null, number_id: KAPSO_NUMBER_ID, line: 'chat' });
  });

  it('asks Kapso for outbound since catchUpSince and follows the cursor; a second run stores nothing new', async () => {
    const x = job();
    x.ext.newestExternal.mockResolvedValue(new Date('2026-10-25T00:54:00Z'));
    x.kapso.outbound.mockImplementation(async (_env, q: { after?: string }) =>
      q.after ? page([kapsoText({ id: 'wamid.P2' })]) : page([kapsoText({ id: 'wamid.P1' })], 'c1'),
    );
    await x.job.runOnce(NOW);
    expect(x.kapso.outbound.mock.calls.map((c) => c[1])).toEqual([{ since: '2026-10-25T00:54:00.000Z' }, { since: '2026-10-25T00:54:00.000Z', after: 'c1' }]);
    expect(x.ext.newestExternal).toHaveBeenCalledWith({ line: 'chat', numberId: KAPSO_NUMBER_ID });
    const [again] = await x.job.runOnce(NOW);
    expect(again).toMatchObject({ stored: 0, known: 2 });
    expect(x.queries.stored).toHaveLength(2);
  });

  it(`stops after ${MAX_PAGES} pages and logs counts only (the last 4 of the number id, never a phone or body)`, async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const info = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const x = job();
    let n = 0;
    x.kapso.outbound.mockImplementation(async () => page([kapsoText({ id: `wamid.${n++}` })], 'more'));
    await x.job.runOnce(NOW);
    expect(x.kapso.outbound).toHaveBeenCalledTimes(MAX_PAGES);
    const logged = [...warn.mock.calls, ...info.mock.calls].map((c) => String(c[0])).join('\n');
    expect(logged).toContain('capped');
    expect(logged).toContain('…at-1');
    expect(logged).not.toMatch(/966501234567|تم تأكيد|fake-kapso-key/);
  });

  it('a Kapso error is logged and ends that number\'s run; never throws', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const x = job();
    x.kapso.outbound.mockRejectedValue(new Error('WhatsApp HTTP 502'));
    await expect(x.job.runOnce(NOW)).resolves.toEqual([{ listed: 0, stored: 0, known: 0, skipped: 0 }]);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('stopped: WhatsApp HTTP 502'));
  });

  it('no Kapso chat number (a disabled one, or legacy meta) → nothing asked', async () => {
    const x = job();
    kapsoOverlay({ enabled: false });
    expect(await x.job.runOnce(NOW)).toEqual([]);
    setNumbersOverlay(null);
    expect(await x.job.runOnce(NOW)).toEqual([]);
    expect(x.kapso.outbound).not.toHaveBeenCalled();
  });
});
