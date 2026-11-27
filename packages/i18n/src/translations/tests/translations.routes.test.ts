import { describe, expect, it } from 'vitest';
import { translationRoutes as routes } from '..';

const ROW = {
  key: 'nav.leads',
  section: 'nav',
  ar: 'العملاء',
  en: 'Leads',
  arOverride: null,
  enOverride: 'Prospects',
};

describe('translationRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /i18n/keys',
      'PUT /i18n/:locale/:key',
      'DELETE /i18n/:locale/:key',
    ]);
  });

  it('takes a known locale and any key, and refuses another locale', () => {
    const params = { locale: 'en', key: 'nav.leads' };
    expect(routes.save.params.parse(params)).toEqual(params);
    expect(routes.restore.params.safeParse({ ...params, locale: 'fr' }).success).toBe(false);
  });

  it('takes a trimmed value and refuses a blank one', () => {
    expect(routes.save.body.parse({ value: ' Prospects ' })).toEqual({ value: 'Prospects' });
    expect(routes.save.body.safeParse({ value: '  ' }).success).toBe(false);
  });

  it('answers a page of rows with every section for the filter', () => {
    const page = { items: [ROW], total: 1, page: 1, pageSize: 50, sections: ['nav'] };
    expect(routes.keys.response.parse(page)).toEqual(page);
    const hint = { ...ROW, valuesKey: 'lesson.duration' };
    expect(routes.keys.response.parse({ ...page, items: [hint] }).items).toEqual([hint]);
  });

  it('refuses a row without its defaults or with an override that is not text', () => {
    const bad = [
      { ...ROW, en: undefined },
      { ...ROW, arOverride: 3 },
    ];
    for (const row of bad) {
      const page = { items: [row], total: 1, page: 1, pageSize: 50, sections: [] };
      expect(routes.keys.response.safeParse(page).success).toBe(false);
    }
  });

  it('answers nothing to a save or a restore', () => {
    expect([routes.save.response, routes.restore.response]).toEqual(['empty', 'empty']);
  });
});
