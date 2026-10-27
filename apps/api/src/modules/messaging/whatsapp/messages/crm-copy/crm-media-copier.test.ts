import { afterEach, describe, expect, it, vi } from 'vitest';
import { CRM_HOST, crmLink, crmResponse, crmRow, stubFetch } from '../crm-history/crm-history.fakes';
import { MAX_ATTEMPTS } from './crm-media-copier';
import { copyWorld, crmRows } from './crm-copy.fakes';

const ogg = () => crmResponse(4, { 'content-type': 'audio/ogg' });

describe('CrmMediaCopier: failures, retries and rows it never touches', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a failing file is retried at most MAX_ATTEMPTS times, then skipped by the batch and counted as failed', async () => {
    const fetch = stubFetch(async () => crmResponse(0, {}, 503));
    const w = copyWorld(crmRows(1));
    const outcomes = [];
    for (let i = 0; i < MAX_ATTEMPTS; i++) outcomes.push(await w.job.runOnce());
    expect(outcomes.map((o) => ('outcomes' in o ? o.outcomes : o.state))).toEqual([['retry'], ['retry'], ['failed']]);
    expect(await w.job.runOnce()).toEqual({ state: 'done' });
    expect(fetch).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(w.audit.record).toHaveBeenCalledWith(expect.objectContaining({ after: { copied: 0, failed: 1, skipped: 0 } }));
    expect(w.storage.upload).not.toHaveBeenCalled();
  });

  it('a file over the cap is skipped at once (413 does not change on a retry)', async () => {
    stubFetch(async () => crmResponse(17 * 1024 * 1024, { 'content-type': 'audio/ogg' }));
    const w = copyWorld(crmRows(1));
    expect(await w.job.runOnce()).toMatchObject({ outcomes: ['skipped'] });
    expect(await w.job.runOnce()).toEqual({ state: 'done' });
    expect(w.audit.record).toHaveBeenCalledWith(expect.objectContaining({ after: { copied: 0, failed: 0, skipped: 1 } }));
  });

  it('never touches a row with a Meta media id, another host, another number or a body that is more than the link', async () => {
    const fetch = stubFetch(async () => ogg());
    const w = copyWorld([
      crmRow({ id: 'meta', media_id: 'wamid-1', media_mime: 'audio/ogg', body: crmLink('a.ogg') }),
      crmRow({ id: 'host', media_mime: 'audio/ogg', body: crmLink('b.ogg', 'other.example') }),
      crmRow({ id: 'kapso', media_mime: 'audio/ogg', body: crmLink('c.ogg'), number: { id: 'n', provider: 'kapso', purpose: 'chat' } }),
      crmRow({ id: 'text', media_mime: 'audio/ogg', body: `${crmLink('d.ogg')} hi` }),
    ]);
    expect(await w.job.runOnce()).toMatchObject({ outcomes: ['skipped'] });
    expect(w.failures.get('text')).toEqual({ attempts: 1, skipped: true });
    expect(await w.job.runOnce()).toEqual({ state: 'done' });
    // Directly, too: a media-id row is skipped without a fetch, an upload or a path write.
    expect(await w.copier.copy('meta', CRM_HOST)).toBe('skipped');
    expect([fetch, w.storage.upload, w.inbound.setPath, w.client.getMedia].map((f) => f.mock.calls.length)).toEqual([0, 0, 0, 0]);
    expect([...w.rows.values()].map((m) => m.body)).toEqual([crmLink('a.ogg'), crmLink('b.ogg', 'other.example'), crmLink('c.ogg'), `${crmLink('d.ogg')} hi`]);
  });

  it('a row gone meanwhile (404) is skipped with no failure row (the foreign key); a storage failure is a retry', async () => {
    stubFetch(async () => ogg());
    const w = copyWorld(crmRows(2));
    expect(await w.copier.copy('missing', CRM_HOST)).toBe('skipped');
    expect(w.queries.mark).not.toHaveBeenCalled();
    w.storage.upload.mockRejectedValueOnce(new Error('storage down'));
    expect(await w.copier.copy('c0', CRM_HOST)).toBe('retry');
    expect(w.failures.get('c0')).toEqual({ attempts: 1, skipped: false });
    expect(await w.copier.copy('c0', CRM_HOST)).toBe('copied');
    expect(w.rows.get('c0')?.media_path).toBe('c0.ogg');
  });

  it('a failing failure write is logged and read as a retry, recorded once, never thrown', async () => {
    stubFetch(async () => crmResponse(0, {}, 503));
    const w = copyWorld(crmRows(1));
    w.queries.mark.mockRejectedValueOnce(new Error('db down'));
    expect(await w.copier.copy('c0', CRM_HOST)).toBe('retry');
    expect(w.queries.mark).toHaveBeenCalledTimes(1);
  });
});
