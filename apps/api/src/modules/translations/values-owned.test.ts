import { isOwnedSettingKey, SEED_ENTRIES } from '@ab/shared';
import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { listKeys } from './translations.catalog';
import type { TranslationsQueries } from './translations.queries';
import { TranslationsService } from './translations.service';
import { assertNotValuesOwned, VALUES_HINT_KEYS } from './values-owned';

const HINT = 'settings.hints.uploadMaxMb';

function service() {
  const q = { all: vi.fn(async () => []), upsert: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) };
  return { q, s: new TranslationsService(q as unknown as TranslationsQueries) };
}

async function conflictBody(run: () => Promise<void>): Promise<unknown> {
  try {
    await run();
  } catch (e) {
    if (e instanceof ConflictException) return e.getResponse();
    throw e;
  }
  return null;
}

describe('«الترجمات» vs «القيم» (docs/26 §3)', () => {
  it('every non-owned SEED_ENTRIES hint key maps to its settings key; owned keys stay on «الترجمات»', () => {
    for (const e of SEED_ENTRIES) {
      if (e.hintKey) expect(VALUES_HINT_KEYS.has(e.hintKey), e.key).toBe(!isOwnedSettingKey(e.key));
    }
    expect(VALUES_HINT_KEYS.get(HINT)).toBe('upload_max_mb');
    expect(VALUES_HINT_KEYS.has('nav.leads')).toBe(false);
  });

  it('PUT and DELETE of the ar override of a hint key: 409 edit_on_values with the settings key', async () => {
    const { q, s } = service();
    const want = { code: 'edit_on_values', message: 'edit_on_values', settingKey: 'upload_max_mb' };
    expect(await conflictBody(() => s.save({ locale: 'ar', key: HINT, value: 'نص', actorId: 'u1' }))).toEqual(want);
    expect(await conflictBody(() => s.restore('ar', HINT))).toEqual(want);
    expect(q.upsert).not.toHaveBeenCalled();
    expect(q.remove).not.toHaveBeenCalled();
  });

  it('the en override of a hint key and the ar override of any other key stay editable', async () => {
    const { q, s } = service();
    await s.save({ locale: 'en', key: HINT, value: 'Max upload', actorId: 'u1' });
    await s.restore('en', HINT);
    await s.save({ locale: 'ar', key: 'nav.leads', value: 'العملاء', actorId: 'u1' });
    expect(q.upsert).toHaveBeenCalledTimes(2);
    expect(q.remove).toHaveBeenCalledTimes(1);
    expect(() => assertNotValuesOwned('en', HINT)).not.toThrow();
  });

  it('the catalog marks those rows with valuesKey (other rows unchanged)', () => {
    const page = listKeys({ page: 1, pageSize: 100, section: 'settings' }, { ar: {}, en: {} });
    const hint = page.items.find((r) => r.key === HINT);
    expect(hint?.valuesKey).toBe('upload_max_mb');
    const plain = page.items.find((r) => !VALUES_HINT_KEYS.has(r.key));
    expect(plain).toBeDefined();
    expect(plain).not.toHaveProperty('valuesKey');
  });
});
