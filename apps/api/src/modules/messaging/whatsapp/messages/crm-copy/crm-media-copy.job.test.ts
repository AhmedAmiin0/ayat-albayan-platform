import { afterEach, describe, expect, it, vi } from 'vitest';
import { crmResponse, stubFetch } from '../crm-history/crm-history.fakes';
import { BATCH } from './crm-media-copier';
import { copyWorld, crmRows } from './crm-copy.fakes';
import { copyHost } from './crm-media-copy.job';

// Owner 2026-10-27 «Fix it»: our own copy of EVERY imported old-CRM file, only while the switch is on.
const ogg = () => crmResponse(4, { 'content-type': 'audio/ogg' });

describe('CrmMediaCopyJob: the switch and the host', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does nothing while crm_media_copy_all is off', async () => {
    const fetch = stubFetch(async () => ogg());
    const w = copyWorld(crmRows(3), { crm_media_copy_all: false });
    expect(await w.job.runOnce()).toEqual({ state: 'off' });
    expect([fetch, w.queries.batch, w.storage.upload, w.audit.record].map((f) => f.mock.calls.length)).toEqual([0, 0, 0, 0]);
  });

  it('does nothing while the host is empty or not a DNS name, and never switches itself off then', async () => {
    const fetch = stubFetch(async () => ogg());
    for (const host of ['', '   ', '127.0.0.1', 'localhost', 'https://x.example/']) {
      const w = copyWorld(crmRows(3), { crm_media_host: host });
      expect(await w.job.runOnce()).toEqual({ state: 'off' });
      expect([w.queries.batch, w.settings.writeSwitch, w.audit.record].map((f) => f.mock.calls.length)).toEqual([0, 0, 0]);
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(copyHost(' Files.CRM.example ')).toBe('files.crm.example');
  });
});

describe('CrmMediaCopyJob: a run', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('copies one batch per tick, two at a time; at zero it switches off and writes ONE audit row', async () => {
    let open = 0;
    let peak = 0;
    stubFetch(async () => {
      peak = Math.max(peak, ++open);
      await new Promise((r) => setTimeout(r, 1));
      open--;
      return ogg();
    });
    const w = copyWorld(crmRows(BATCH + 5));
    expect(await w.job.runOnce()).toMatchObject({ state: 'copied', outcomes: Array(BATCH).fill('copied') });
    expect(peak).toBe(2);
    expect(await w.job.runOnce()).toMatchObject({ state: 'copied', outcomes: Array(5).fill('copied') });
    expect(w.objects.size).toBe(BATCH + 5);
    expect(await w.job.runOnce()).toEqual({ state: 'done' });
    expect(w.settings.state.crm_media_copy_all).toBe(false);
    expect(w.settings.writeSwitch).toHaveBeenCalledWith('crm_media_copy_all', false, null);
    expect(w.audit.record).toHaveBeenCalledTimes(1);
    expect(w.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: null, entity: 'settings', action: 'crm_media_copy_done', after: { copied: BATCH + 5, failed: 0, skipped: 0, remaining: 0 } }),
    );
    // Off again: later ticks read nothing.
    expect(await w.job.runOnce()).toEqual({ state: 'off' });
    expect(w.audit.record).toHaveBeenCalledTimes(1);
  });

  it('idempotent: switched on again, nothing is fetched or stored twice (lazily opened rows too)', async () => {
    const fetch = stubFetch(async () => ogg());
    const w = copyWorld(crmRows(4));
    // An admin opened c0 first (the lazy path): the job never fetches it again.
    await w.copier.copy('c0', 'files.crm.example');
    await w.job.runOnce();
    await w.job.runOnce();
    w.settings.state.crm_media_copy_all = true;
    expect(await w.job.runOnce()).toEqual({ state: 'done' });
    expect([fetch.mock.calls.length, w.storage.upload.mock.calls.length, w.objects.size]).toEqual([4, 4, 4]);
    expect(w.inbound.setPath).toHaveBeenCalledTimes(4);
    expect(w.audit.record).toHaveBeenCalledTimes(2);
  });

  it('never overlaps: a tick while one runs is busy and copies nothing', async () => {
    const gate: { release?: () => void } = {};
    stubFetch(() => new Promise<Response>((r) => (gate.release = () => r(ogg()))));
    const w = copyWorld(crmRows(1));
    const first = w.job.runOnce();
    await vi.waitFor(() => expect(gate.release).toBeDefined());
    expect(await w.job.runOnce()).toEqual({ state: 'busy' });
    gate.release?.();
    expect(await first).toMatchObject({ state: 'copied' });
  });

  it('never throws: a failing batch read is logged and the next tick tries again', async () => {
    const w = copyWorld(crmRows(1));
    w.queries.batch.mockRejectedValueOnce(new Error('db down'));
    expect(await w.job.runOnce()).toEqual({ state: 'error' });
    expect(w.settings.state.crm_media_copy_all).toBe(true);
  });

  it('audit first: a failed switch-off is retried alone on the next tick, still ONE audit row', async () => {
    const w = copyWorld([]);
    w.settings.writeSwitch.mockRejectedValueOnce(new Error('denied'));
    expect(await w.job.runOnce()).toEqual({ state: 'error' });
    expect(w.audit.record).toHaveBeenCalledTimes(1);
    expect(w.settings.state.crm_media_copy_all).toBe(true);
    expect(await w.job.runOnce()).toEqual({ state: 'done' });
    expect(w.audit.record).toHaveBeenCalledTimes(1);
    expect(w.settings.state.crm_media_copy_all).toBe(false);
  });

  it('a failed audit write leaves the switch on: the next tick writes the row, then switches off', async () => {
    const w = copyWorld([]);
    w.audit.record.mockRejectedValueOnce(new Error('denied'));
    expect(await w.job.runOnce()).toEqual({ state: 'error' });
    expect([w.settings.writeSwitch.mock.calls.length, w.settings.state.crm_media_copy_all]).toEqual([0, true]);
    expect(await w.job.runOnce()).toEqual({ state: 'done' });
    expect(w.audit.record).toHaveBeenCalledTimes(2);
    expect(w.settings.state.crm_media_copy_all).toBe(false);
  });

  it('does not run on boot, ticks after 15 minutes then every minute, and clears its timers on shutdown', async () => {
    vi.useFakeTimers();
    const w = copyWorld([], { crm_media_copy_all: false });
    const read = vi.spyOn(w.job, 'runOnce');
    w.job.onApplicationBootstrap();
    expect(read).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15 * 60_000 - 1);
    expect(read).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3 * 60_000);
    expect(read).toHaveBeenCalledTimes(4);
    const after = read.mock.calls.length;
    w.job.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(read).toHaveBeenCalledTimes(after);
    vi.useRealTimers();
  });
});
