import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ar, BUNDLES } from '../../common/i18n/server-text';
import { BOOT_LOAD_MS, REFRESH_MS, TranslationsService } from './translations.service';
import type { OverrideRow, TranslationsQueries } from './translations.queries';

function fakeQueries(rows: OverrideRow[] = []) {
  const q = { all: vi.fn(async () => rows), upsert: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) };
  return { q, service: new TranslationsService(q as unknown as TranslationsQueries) };
}

describe('TranslationsService', () => {
  afterEach(async () => {
    // Leave the shared live copy as the bundle for the other tests in this worker.
    await fakeQueries([]).service.refresh();
    vi.useRealTimers();
  });

  it('refresh merges Arabic overrides into the server copy in place; unknown keys and locales are ignored', async () => {
    const { reports } = ar;
    const { service } = fakeQueries([
      { key: 'reports.pdf.minutes', locale: 'ar', value: '{n} د' },
      { key: 'nav.leads', locale: 'en', value: 'Prospects' },
      { key: 'nav.gone', locale: 'ar', value: 'x' },
      { key: 'nav.leads', locale: 'fr', value: 'x' },
    ]);
    expect(await service.refresh()).toBe(true);
    expect(reports.pdf.minutes).toBe('{n} د');
    expect(service.overrides('en').values).toEqual({ 'nav.leads': 'Prospects' });
    expect(service.overrides('ar').values).toEqual({ 'reports.pdf.minutes': '{n} د' });
    expect(BUNDLES.ar.reports.pdf.minutes).not.toBe('{n} د');
  });

  it('a removed override goes back to the bundled text on the next refresh', async () => {
    const rows: OverrideRow[] = [{ key: 'nav.leads', locale: 'ar', value: 'قائمة' }];
    const { service } = fakeQueries(rows);
    await service.refresh();
    expect(ar.nav.leads).toBe('قائمة');
    rows.pop();
    await service.refresh();
    expect(ar.nav.leads).toBe(BUNDLES.ar.nav.leads);
  });

  it('a failed read keeps the last good overrides and never throws', async () => {
    const { q, service } = fakeQueries([{ key: 'nav.leads', locale: 'en', value: 'Prospects' }]);
    await service.refresh();
    q.all.mockRejectedValueOnce(new Error('db down'));
    expect(await service.refresh()).toBe(false);
    expect(service.overrides('en').values).toEqual({ 'nav.leads': 'Prospects' });
  });

  it('the etag changes with the values and is stable otherwise', async () => {
    const rows: OverrideRow[] = [];
    const { service } = fakeQueries(rows);
    await service.refresh();
    const empty = service.overrides('ar').etag;
    rows.push({ key: 'nav.leads', locale: 'ar', value: 'قائمة' });
    await service.refresh();
    expect(service.overrides('ar').etag).not.toBe(empty);
    expect(service.overrides('en').etag).toBe(empty);
  });

  describe('timers', () => {
    beforeEach(() => vi.useFakeTimers());

    it('loads just after boot (never during it), then every REFRESH_MS until destroyed', async () => {
      const { q, service } = fakeQueries();
      service.onApplicationBootstrap();
      expect(q.all).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(BOOT_LOAD_MS);
      expect(q.all).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(REFRESH_MS - BOOT_LOAD_MS);
      expect(q.all).toHaveBeenCalledTimes(2);
      service.onModuleDestroy();
      await vi.advanceTimersByTimeAsync(REFRESH_MS * 2);
      expect(q.all).toHaveBeenCalledTimes(2);
    });
  });

  it('save validates, writes with the actor, then reloads', async () => {
    const { q, service } = fakeQueries();
    await service.save({ locale: 'en', key: 'nav.leads', value: 'Prospects', actorId: 'u1' });
    expect(q.upsert).toHaveBeenCalledWith({ locale: 'en', key: 'nav.leads', value: 'Prospects', actorId: 'u1' });
    expect(q.all).toHaveBeenCalledTimes(1);
  });

  it('save refuses an unknown key (404) and dropped placeholders (400) without writing', async () => {
    const { q, service } = fakeQueries();
    await expect(service.save({ locale: 'en', key: 'nav.nope', value: 'x', actorId: 'u1' })).rejects.toMatchObject({ status: 404 });
    await expect(service.save({ locale: 'en', key: 'translations.count', value: 'Total', actorId: 'u1' })).rejects.toMatchObject({
      status: 400,
      response: { message: 'placeholders_missing', missing: ['{n}'] },
    });
    expect(q.upsert).not.toHaveBeenCalled();
  });

  it('restore deletes the override and reloads; unknown keys are 404', async () => {
    const { q, service } = fakeQueries();
    await service.restore('ar', 'nav.leads');
    expect(q.remove).toHaveBeenCalledWith('ar', 'nav.leads');
    await expect(service.restore('ar', 'nope')).rejects.toMatchObject({ status: 404 });
  });
});
