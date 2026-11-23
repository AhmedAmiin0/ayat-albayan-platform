import { describe, expect, it } from 'vitest';
import { legalContent, sectionViews } from './legal-content';

describe('sectionViews: the i18n sections of a legal page, ready to render', () => {
  it('keeps the bundle order; items become a list in their order', () => {
    const views = sectionViews({
      a: { title: 'A', body: 'a body', items: { x: 'X', y: 'Y' } },
      b: { title: 'B', body: 'b body' },
    });
    expect(views.map((v) => [v.id, v.title, v.body, v.items])).toEqual([
      ['a', 'A', 'a body', ['X', 'Y']],
      ['b', 'B', 'b body', []],
    ]);
  });

  it('«steps» is numbered; every other section is bullets', () => {
    const views = sectionViews({ steps: { title: 'S', items: { one: '1' } }, kept: { title: 'K' } });
    expect(views.map((v) => v.ordered)).toEqual([true, false]);
  });

  it('only «contact» carries the academy contact link', () => {
    const views = sectionViews({ who: { title: 'W' }, contact: { title: 'C', body: 'write' } });
    expect(views.map((v) => v.withContact)).toEqual([false, true]);
  });

  it('a note stays apart from the body; none is undefined', () => {
    const [shared, plain] = sectionViews({ s: { title: 'S', note: 'law' }, p: { title: 'P' } });
    expect([shared?.note, plain?.note, plain?.body]).toEqual(['law', undefined, undefined]);
  });

  it('no sections: an empty page body, never a crash', () => {
    expect(sectionViews({})).toEqual([]);
  });
});

describe('legalContent: each page reads its own i18n branch', () => {
  it('privacy: its title, intro and ten sections ending with contact', () => {
    const page = legalContent('privacy');
    expect(page.title).toBe('سياسة الخصوصية');
    expect(page.intro.length).toBeGreaterThan(0);
    expect(page.sections).toHaveLength(10);
    expect(page.sections.at(-1)?.withContact).toBe(true);
  });

  it('deletion: numbered steps first, contact last', () => {
    const page = legalContent('deleteAccount');
    expect(page.title).toBe('حذف الحساب وبياناته');
    expect(page.sections[0]).toMatchObject({ id: 'steps', ordered: true });
    expect(page.sections[0]?.items).toHaveLength(4);
    expect(page.sections.at(-1)?.withContact).toBe(true);
  });
});
