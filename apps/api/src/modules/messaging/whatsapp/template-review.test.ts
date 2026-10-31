import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SEEDS } from './templates/catalog/seed-templates.fakes';
import { bodyExamples, SAMPLE_REPORT, templateProblem } from './template-review';
import { bodyVarCount, submitPayload } from './messages/wa-components';
import { templateRow } from './whatsapp.fakes';
import { migrationPath } from '@/common/db/repo-paths.test-util';

const MIGRATION = migrationPath('20261001000141_message_templates.sql');
type Component = { type: string; text?: string; example?: { body_text?: string[][] }; buttons?: { type: string; text: string }[] };
const components = (row: (typeof SEEDS)[number]) => submitPayload(row, 'h')['components'] as Component[];

describe('the four new templates, as Meta will review them (docs/12 §3.4)', () => {
  it('the fakes are migration 141’s rows byte for byte', () => {
    const sql = readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n');
    for (const row of SEEDS) {
      expect(sql).toContain(row.body_ar);
      expect(sql).toContain(`'${row.key}', '${row.meta_name}', '${row.category}'`);
      expect(sql).toContain(JSON.stringify(row.params).replace(/","/g, '", "'));
    }
  });

  it.each(SEEDS.map((row) => [row.key, row] as const))('%s: nothing Meta rejects on, a realistic sample per {{n}}', (_key, row) => {
    expect(templateProblem(row)).toBeNull();
    const payload = submitPayload(row, 'h');
    expect(payload).toMatchObject({ name: row.meta_name, language: 'ar', category: row.category.toUpperCase() });
    const body = components(row).find((c) => c.type === 'BODY');
    const samples = body?.example?.body_text?.[0] ?? [];
    expect(samples).toHaveLength(bodyVarCount(row.body_ar));
    expect(samples.every((s) => s.trim() && !/^[a-z_0-9]+$/.test(s))).toBe(true);
    expect(row.body_ar.length).toBeLessThanOrEqual(1024);
    expect(components(row).find((c) => c.type === 'FOOTER')).toEqual({ type: 'FOOTER', text: 'أكاديمية آيات البيان' });
  });

  it('quick replies on the 24 h reminder and the follow-up (≤ 25 characters each); none on the others', () => {
    const replies = (key: string) => {
      const row = SEEDS.find((r) => r.key === key) ?? templateRow();
      return components(row).find((c) => c.type === 'BUTTONS')?.buttons ?? [];
    };
    expect(replies('lesson_reminder_24h')).toEqual([
      { type: 'QUICK_REPLY', text: 'تمام، هنحضر' },
      { type: 'QUICK_REPLY', text: 'محتاجين نغيّر الميعاد' },
    ]);
    expect(replies('follow_up_slots')).toEqual([{ type: 'QUICK_REPLY', text: 'وقف الرسايل' }]);
    expect([...replies('lesson_reminder_24h'), ...replies('follow_up_slots')].every((b) => b.text.length <= 25)).toBe(true);
    expect([replies('renewal_due'), replies('report_ready')]).toEqual([[], []]);
  });

  it('an unknown param name is its own sample', () => {
    expect(bodyExamples(templateRow({ params: ['student_name', 'something_new'] }))).toEqual(['أحمد', 'something_new']);
  });

  it('an admin-made row sends its own samples by position (migration 994), the name map only past them', () => {
    const row = templateRow({ params: ['student_name', 'var_2', 'student_name'], samples: ['Sara', 'Sunday'] });
    expect(bodyExamples(row)).toEqual(['Sara', 'Sunday', 'أحمد']);
  });
});

describe('templateProblem: what Meta would reject, caught before any call', () => {
  const problem = (body_ar: string, params: string[] = ['a', 'b']) => templateProblem(templateRow({ body_ar, params }));

  it.each([
    ['{{1}} عندك حلقة {{2}} النهاردة', 'a variable at the start or end of the body'],
    ['تم حجز حلقة {{1}} — {{2}}', 'a variable at the start or end of the body'],
    ['حلقة {{1}} {{2}} النهاردة', 'two variables side by side'],
    ['حلقة {{1}} يوم {{3}} النهاردة', 'variables must be numbered 1..n'],
  ])('%s → %s', (body, why) => {
    expect(problem(body)).toBe(why);
  });

  it('every variable needs a sample value, and no extra ones', () => {
    expect(problem('حلقة {{1}} يوم {{2}} إن شاء الله', ['a'])).toBe('2 variables but 1 sample values');
    expect(problem('نص ثابت', ['a'])).toBe('0 variables but 1 sample values');
    expect(problem('  حلقة {{1}} يوم {{2}} إن شاء الله \n')).toBeNull();
  });
});

describe('SAMPLE_REPORT: the PDF report_ready’s header sample uploads', () => {
  const pdf = Buffer.from(SAMPLE_REPORT.bytes).toString('latin1');

  it('is a small application/pdf file named .pdf', () => {
    expect(SAMPLE_REPORT).toMatchObject({ name: 'lesson-report-sample.pdf', mime: 'application/pdf' });
    expect(SAMPLE_REPORT.bytes.byteLength).toBeLessThan(2048);
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true);
    expect(pdf.endsWith('%%EOF\n')).toBe(true);
  });

  it('has a sound xref: startxref points at it and every entry at its object', () => {
    const startxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(pdf)?.[1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe('xref');
    const offsets = [...pdf.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(5);
    offsets.forEach((at, i) => expect(pdf.slice(at).startsWith(`${i + 1} 0 obj`)).toBe(true));
    expect(pdf).toContain('/Count 1');
  });
});
