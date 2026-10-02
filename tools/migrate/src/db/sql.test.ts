import { describe, expect, it } from 'vitest';
import {
  findByColumnSql,
  ident,
  insertSql,
  param,
  recordItemSql,
  tableIdent,
  updateSql,
} from './sql.ts';

describe('identifiers', () => {
  it('quotes safe names and rejects anything else', () => {
    expect(ident('phone_e164')).toBe('"phone_e164"');
    expect(() => ident('x; drop table y')).toThrow(/identifier/);
    expect(() => ident('Name')).toThrow();
    expect(tableIdent('students')).toBe('"public"."students"');
    expect(tableIdent('storage.objects')).toBe('"storage"."objects"');
  });
});

describe('param', () => {
  it('stringifies jsonb objects, keeps arrays and scalars', () => {
    expect(param({ a: 1 })).toBe('{"a":1}');
    expect(param(['quran'])).toEqual(['quran']);
    expect(param(3)).toBe(3);
    expect(param(null)).toBeNull();
  });
});

describe('insertSql', () => {
  it('builds a parameterised insert returning id', () => {
    const q = insertSql({
      table: 'teachers',
      columns: { display_name_ar: 'أ', programs: ['quran'], notes: null },
    });
    expect(q.text).toBe(
      'insert into "public"."teachers" ("display_name_ar", "programs", "notes") values ($1, $2, $3) returning id',
    );
    expect(q.params).toEqual(['أ', ['quran'], null]);
  });
  it('supports legacy identity values and link tables', () => {
    expect(
      insertSql({ table: 'students', columns: { code_seq: 7 }, overridingSystemValue: true }).text,
    ).toContain('("code_seq") overriding system value values ($1) returning id');
    expect(
      insertSql({ table: 'lesson_students', columns: { lesson_id: 'l' }, returning: null }).text,
    ).toMatch(/on conflict do nothing$/);
    const legacy = { table: 'students', columns: { code_seq: 7 }, onConflict: 'nothing' } as const;
    expect(insertSql(legacy).text).toMatch(/values \(\$1\) on conflict do nothing returning id$/);
  });
  it('refuses an empty insert', () => {
    expect(() => insertSql({ table: 't', columns: {} })).toThrow();
  });
});

describe('updateSql / findByColumnSql', () => {
  it('updates by id', () => {
    const q = updateSql({
      table: 'guardians',
      id: 'g1',
      columns: { name: 'n', qualification: { x: 1 } },
    });
    expect(q.text).toBe(
      'update "public"."guardians" set "name" = $1, "qualification" = $2 where "id" = $3',
    );
    expect(q.params).toEqual(['n', '{"x":1}', 'g1']);
    expect(() => updateSql({ table: 't', id: 'x', columns: {} })).toThrow();
  });
  it('looks rows up by a unique column', () => {
    const q = findByColumnSql({ table: 'leads', column: 'phone_e164', values: ['+201000000001'] });
    expect(q.text).toContain('from "public"."leads" where "phone_e164"::text = any($1)');
    expect(q.params).toEqual([['+201000000001']]);
  });
});

describe('recordItemSql', () => {
  it('upserts on the natural key and keeps the first run', () => {
    const q = recordItemSql({
      entity: 'guardians',
      naturalKey: '+201000000001',
      targetTable: 'guardians',
      targetId: 'g1',
      payloadHash: 'h',
      sourceRef: { source: 'HUB', tab: 't', row: 2 },
      runId: 'r1',
    });
    expect(q.text).toContain('on conflict (entity, natural_key) do update');
    expect(q.text).not.toContain('first_run_id = excluded');
    expect(q.params).toEqual([
      'guardians',
      '+201000000001',
      'guardians',
      'g1',
      null,
      'h',
      '{"source":"HUB","tab":"t","row":2}',
      'r1',
    ]);
  });
});
