import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CRM_HOST, crmLink, crmResponse, crmRow, stubFetch } from '../crm-history/crm-history.fakes';
import { BATCH, MAX_ATTEMPTS } from './crm-media-copier';
import { copyWorld, crmRows } from './crm-copy.fakes';

// Review of #327: an outage of the old CRM's storage is not an answer about a file.
const ogg = () => crmResponse(4, { 'content-type': 'audio/ogg' });

describe('CrmMediaCopyJob: the old CRM storage not answering', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('a rejected fetch, 5xx or 429 counts no attempt, stops the tick after its round and logs a warning', async () => {
    for (const answer of [() => Promise.reject(new TypeError('fetch failed')), async () => crmResponse(0, {}, 503), async () => crmResponse(0, {}, 429)]) {
      const fetch = stubFetch(answer);
      const w = copyWorld(crmRows(BATCH));
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      expect(await w.job.runOnce()).toEqual({ state: 'unreachable', outcomes: ['unreachable', 'unreachable'] });
      // One round of two, not the whole batch of 20.
      expect(fetch).toHaveBeenCalledTimes(2);
      expect([w.queries.mark.mock.calls.length, w.failures.size]).toEqual([0, 0]);
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    }
  });

  it('an hour of outage burns nothing: when the storage is back every row is copied', async () => {
    const down = { now: true };
    stubFetch(async () => (down.now ? crmResponse(0, {}, 502) : ogg()));
    const w = copyWorld(crmRows(3));
    for (let i = 0; i < 60; i++) expect(await w.job.runOnce()).toMatchObject({ state: 'unreachable' });
    down.now = false;
    expect(await w.job.runOnce()).toMatchObject({ state: 'copied', outcomes: ['copied', 'copied', 'copied'] });
    expect(await w.job.runOnce()).toEqual({ state: 'done' });
    expect(w.audit.record).toHaveBeenCalledWith(expect.objectContaining({ after: { copied: 3, failed: 0, skipped: 0, remaining: 0 } }));
  });

  it('a real storage answer (404) still counts, up to the cap', async () => {
    stubFetch(async () => crmResponse(0, {}, 404));
    const w = copyWorld(crmRows(1));
    for (let i = 0; i < MAX_ATTEMPTS; i++) await w.job.runOnce();
    expect(w.failures.get('c0')).toEqual({ attempts: MAX_ATTEMPTS, skipped: false });
  });
});

describe('CrmMediaCopyJob: the «done» audit row sees files the batch never picks', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('remaining counts a CRM link on another host (no copy, no failure row); copied files and failures do not', async () => {
    stubFetch(async () => ogg());
    const w = copyWorld([
      ...crmRows(2),
      crmRow({ id: 'elsewhere', media_mime: 'audio/ogg', body: crmLink('x.ogg', 'old-files.crm.example') }),
      crmRow({ id: 'text', media_mime: 'audio/ogg', body: `${crmLink('d.ogg')} hi` }),
    ]);
    expect(await w.job.runOnce()).toMatchObject({ state: 'copied' });
    expect(await w.job.runOnce()).toEqual({ state: 'done' });
    expect(w.audit.record).toHaveBeenCalledWith(expect.objectContaining({ after: { copied: 2, failed: 0, skipped: 1, remaining: 1 } }));
    expect(w.rows.get('elsewhere')?.media_path).toBeNull();
    expect(CRM_HOST).not.toBe('old-files.crm.example');
  });
});
