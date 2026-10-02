// validate --target: docs/06 «Validation after apply» as SQL checks → stdout table + out/validate.md
// (counts only). 'zero' checks are hard: any FAIL makes the command exit 1. Source comparisons
// (SUBS, ATT) live in validate.sources.ts.
import type { TargetDb } from './db/target.ts';
import { tableIdent } from './db/sql.ts';

export interface Check {
  name: string;
  /** Must return one row { n: number }. */
  sql: string;
  /** 'zero' fails when n > 0; 'info' only reports. */
  expect: 'zero' | 'info';
}

const count = (from: string): string => `select count(*)::int as n from ${from}`;

export const CHECKS: Check[] = [
  {
    name: 'completed lessons in the future',
    sql: count(`public.lessons where status = 'completed' and starts_at > now()`),
    expect: 'zero',
  },
  {
    name: 'lessons without a teacher',
    sql: count(`public.lessons where teacher_id is null`),
    expect: 'zero',
  },
  {
    name: 'students without a guardian phone',
    sql: count(`public.students s left join public.guardians g on g.id = s.guardian_id
          where g.phone_e164 is null`),
    expect: 'zero',
  },
  {
    name: 'same guardian, same normalised name (A1 duplicates)',
    sql: count(`(select 1 from public.students group by guardian_id, name_normalized
          having count(*) > 1) d`),
    expect: 'zero',
  },
  {
    name: 'student codes at or past the code sequence (legacy AB-nnnn)',
    // Sequence not found → coalesce 0 → every student counts: fails loudly, never silently.
    sql: count(`public.students where code_seq >= coalesce((select coalesce(q.last_value + 1, q.start_value)
          from pg_sequences q where q.schemaname || '.' || q.sequencename
          = pg_get_serial_sequence('public.students', 'code_seq')), 0)`),
    expect: 'zero',
  },
  {
    name: 'lessons without students',
    sql: count(`public.lessons l
          where not exists (select 1 from public.lesson_students ls where ls.lesson_id = l.id)`),
    expect: 'zero',
  },
  {
    name: 'submitted reports without a version row',
    sql: count(`public.lesson_reports r where r.status = 'submitted' and not exists
          (select 1 from public.lesson_report_versions v where v.report_id = r.id)`),
    expect: 'zero',
  },
  {
    name: 'report PDF ready without a path',
    sql: count(`public.lesson_reports where pdf_status = 'ready' and pdf_path is null`),
    expect: 'zero',
  },
  {
    name: 'last import run not succeeded',
    sql: count(`(select status from public.import_runs order by started_at desc limit 1) r
          where r.status <> 'succeeded'`),
    expect: 'zero',
  },
  {
    // JSON text bound to a jsonb parameter lands as a jsonb string (staging 2026-10-02, db/sql.ts).
    name: 'imported jsonb stored as a string',
    sql: count(`(select qualification v from public.leads union all
          select snapshot from public.lesson_report_versions union all
          select price_source from public.subscriptions union all
          select source_ref from public.import_items) j where jsonb_typeof(j.v) = 'string'`),
    expect: 'zero',
  },
  {
    name: 'submitted reports without a PDF path',
    sql: count(`public.lesson_reports where status = 'submitted' and pdf_path is null`),
    expect: 'info',
  },
  {
    name: 'active students without a teacher (A3)',
    sql: count(`public.students where status = 'active' and teacher_id is null`),
    expect: 'info',
  },
];

export interface CheckResult {
  name: string;
  n: number;
  ok: boolean;
}

/** import_items whose target row no longer exists (deleted or merged after import). */
async function orphanChecks(db: TargetDb): Promise<CheckResult[]> {
  const tables = await db.select<{ target_table: string }>({
    text: `select distinct target_table from public.import_items where target_id is not null and target_table not like '%.%'`,
    params: [],
  });
  const out: CheckResult[] = [];
  for (const { target_table } of tables) {
    const [row] = await db.select<{ n: number }>({
      text: `select count(*)::int as n from public.import_items i where i.target_table = $1 and i.target_id is not null
             and not exists (select 1 from ${tableIdent(target_table)} t where t.id = i.target_id)`,
      params: [target_table],
    });
    out.push({
      name: `import_items → missing ${target_table} rows`,
      n: row?.n ?? 0,
      ok: (row?.n ?? 0) === 0,
    });
  }
  return out;
}

export async function runChecks(db: TargetDb): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const c of CHECKS) {
    const [row] = await db.select<{ n: number }>({ text: c.sql, params: [] });
    const n = row?.n ?? 0;
    results.push({ name: c.name, n, ok: c.expect === 'info' || n === 0 });
  }
  return [...results, ...(await orphanChecks(db))];
}

export function checksMarkdown(target: string, results: readonly CheckResult[]): string {
  const rows = results.map((r) => `| ${r.ok ? 'ok' : 'FAIL'} | ${r.name} | ${r.n} |`);
  return [`# Validate ${target}`, '', '| | check | rows |', '|---|---|---|', ...rows, ''].join(
    '\n',
  );
}

/** Fixed-width table for the terminal (counts only). */
export function checksTable(results: readonly CheckResult[]): string {
  const width = Math.max(5, ...results.map((r) => r.name.length));
  const line = (a: string, b: string, c: string) => `${a.padEnd(4)}  ${b.padEnd(width)}  ${c}`;
  return [
    line('', 'check', 'rows'),
    ...results.map((r) => line(r.ok ? 'ok' : 'FAIL', r.name, String(r.n))),
  ].join('\n');
}
