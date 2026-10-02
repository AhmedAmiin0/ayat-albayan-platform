// validate: SQL checks against a fake target (n per check), source comparisons, output.
import { describe, expect, it } from 'vitest';
import { fakeDb } from './plan/fake-db.ts';
import type { SourceRow } from './types.ts';
import { CHECKS, checksMarkdown, checksTable, runChecks } from './validate.ts';
import { attByStudent, compareAtt, sourceChecks, subsByTeacher } from './validate.sources.ts';

const row = (fields: SourceRow['fields'], file?: string): SourceRow => ({
  ref: { source: 'SUBS', tab: 't', row: 2, file },
  fields,
});

describe('runChecks', () => {
  it('fails only hard checks with rows; info checks always pass', async () => {
    const f = fakeDb({
      select: (text) => {
        if (text.includes('code_seq >=')) return [{ n: 2 }];
        if (text.includes('pdf_path is null') && text.includes("'submitted'")) return [{ n: 7 }];
        if (text.includes('distinct target_table')) return [{ target_table: 'students' }];
        if (text.includes('from public.import_items i')) return [{ n: 1 }];
        return [{ n: 0 }];
      },
    });
    const results = await runChecks(f.db);
    expect(results).toHaveLength(CHECKS.length + 1);
    const failing = results.filter((r) => !r.ok).map((r) => [r.name, r.n]);
    expect(failing).toEqual([
      ['student codes at or past the code sequence (legacy AB-nnnn)', 2],
      ['import_items → missing students rows', 1],
    ]);
    expect(results.find((r) => r.name.startsWith('submitted reports without a PDF'))).toMatchObject(
      {
        n: 7,
        ok: true,
      },
    );
  });

  it('prints a table and markdown with counts only', () => {
    const results = [
      { name: 'a', n: 0, ok: true },
      { name: 'bb', n: 3, ok: false },
    ];
    expect(checksTable(results).split('\n')).toEqual([
      '      check  rows',
      'ok    a      0',
      'FAIL  bb     3',
    ]);
    expect(checksMarkdown('staging', results)).toContain('| FAIL | bb | 3 |');
  });
});

describe('source checks', () => {
  it('counts SUBS students per teacher slug', () => {
    const subs = [
      row({ teacher: 'أبرار' }),
      row({ teacher: 'Abrar' }),
      row({ teacher: 'الفيوم' }),
      row({ teacher: null }),
    ];
    expect([...subsByTeacher(subs)]).toEqual([
      ['abrar', 2],
      ['?', 2],
    ]);
  });

  it('compares ATT rows with completed lessons per student', () => {
    const att = attByStudent([
      row({}, 'تقارير آيات البيان/ليلى/سجل حضور — ليلى.xlsx'),
      row({}, 'تقارير آيات البيان/ليلى/سجل حضور — ليلى.xlsx'),
      row({}, 'تقارير آيات البيان/شادي/سجل حضور — شادي.xlsx'),
      row({}, 'تقارير آيات البيان/نورة/سجل حضور — نورة.xlsx'),
    ]);
    expect(att.get('ليلي')).toBe(2);
    const db = [
      { name: 'ليلى', n: 2 },
      { name: 'شادى', n: 0 },
      { name: 'نوره', n: 1 },
      { name: 'نورة', n: 1 },
    ];
    expect(compareAtt({ att, db })).toEqual({ differ: 1, unmatched: 1 });
  });

  it('reports per-teacher counts as info rows', async () => {
    const f = fakeDb({
      select: (text) =>
        text.includes('display_name_en') ? [{ name_en: 'Abrar', n: 3 }] : [{ name: 'ليلى', n: 1 }],
    });
    const bundle = {
      sheets: { subs_students: [row({ teacher: 'ابرار' })] },
      crm: {},
      earlier: new Map(),
      today: '2026-10-02',
    };
    const out = await sourceChecks(f.db, bundle);
    expect(out[0]).toEqual({ name: 'active students of abrar (SUBS 1)', n: 3, ok: true });
    expect(out.every((r) => r.ok)).toBe(true);
  });
});
