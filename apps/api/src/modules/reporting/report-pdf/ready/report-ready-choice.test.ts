import { describe, expect, it } from 'vitest';
import { sampleSource } from '@/modules/reporting/report-pdf/report-pdf.fakes';
import { readyMessages } from './report-ready-choice';

// Invented data (report-pdf.fakes): no real student, teacher or phone.
const NOW = new Date('2026-09-29T15:12:00Z');
const base = {
  // First submit 31 min ago, window 30: this is the render at the close (+ the 60 s grace).
  source: sampleSource({
    report: { ...sampleSource().report, version: 1, submitted_at: '2026-09-29T14:41:00Z' },
  }),
  feedbackUrl: 'https://api.example/r/Ab12Cd34Ef',
  now: NOW,
  pdfPath: 's1/l1.pdf',
  minutes: 30,
};
const PUBLIC_ID = '0123456789abcdef0123456789abcdef';

describe('readyMessages — which templates go after the PDF', () => {
  it("neither link template approved: today's report_ready (the PDF) to the family only", () => {
    const out = readyMessages({ ...base, approved: new Set() });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      template_key: 'report_ready',
      dedup_key: 'report_ready:r1',
      template_params: { document: { path: 's1/l1.pdf' } },
    });
  });

  it('report_ready_family approved: the family gets the link, the same dedup key, no document', () => {
    const [family, ...rest] = readyMessages({
      ...base,
      approved: new Set(['report_ready_family']),
    });
    expect(rest).toEqual([]);
    expect(family).toEqual({
      direction: 'outbound',
      status: 'queued',
      phone_e164: '+966551234567',
      guardian_id: 'g1',
      lesson_id: 'l1',
      template_key: 'report_ready_family',
      template_params: {
        '1': 'سلمى عبد الرحمن',
        '2': '29/09/2026',
        '3': 'هدى سامي',
        '4': base.feedbackUrl,
        button: PUBLIC_ID,
      },
      dedup_key: 'report_ready:r1',
      scheduled_for: NOW.toISOString(),
    });
  });

  it("report_ready_teacher approved: the teacher's link too, in the teacher's zone, deduped per report", () => {
    const out = readyMessages({ ...base, approved: new Set(['report_ready_teacher']) });
    expect(out.map((m) => m.template_key)).toEqual(['report_ready', 'report_ready_teacher']);
    expect(out[1]).toMatchObject({
      phone_e164: '+15550000002',
      guardian_id: null,
      template_params: { '1': 'سلمى عبد الرحمن', '2': '29/09/2026', button: PUBLIC_ID },
      dedup_key: 'report_ready_teacher:r1',
    });
  });

  it('both approved: two messages; a teacher without a phone gets none', () => {
    const both = new Set(['report_ready_family', 'report_ready_teacher']);
    expect(readyMessages({ ...base, approved: both }).map((m) => m.template_key)).toEqual([
      'report_ready_family',
      'report_ready_teacher',
    ]);
    const teacher = { display_name_ar: 'هدى سامي', phone_e164: null, tz: 'Africa/Cairo' };
    const source = { ...base.source, teacher };
    expect(readyMessages({ ...base, source, approved: both }).map((m) => m.template_key)).toEqual([
      'report_ready_family',
    ]);
  });

  it("in-window edits (version 3) rendered at the close still queue the teacher's message (docs/46 B4)", () => {
    const source = { ...base.source, report: { ...base.source.report, version: 3, sent_at: null } };
    const out = readyMessages({ ...base, source, approved: new Set(['report_ready_teacher']) });
    expect(out.map((m) => m.template_key)).toEqual(['report_ready', 'report_ready_teacher']);
  });

  it("an admin's re-render after the send never queues the teacher's message (it says nothing new)", () => {
    const sent = { ...base.source.report, version: 2, sent_at: '2026-09-29T15:13:00Z' };
    const out = readyMessages({ ...base, source: { ...base.source, report: sent }, approved: new Set(['report_ready_teacher']) });
    expect(out.map((m) => m.template_key)).toEqual(['report_ready']);
  });

  it("an admin's re-render of an old never-sent report (version 3) never tells the teacher", () => {
    const old = { ...base.source.report, version: 3, sent_at: null, submitted_at: '2026-08-01T10:00:00Z' };
    const out = readyMessages({ ...base, source: { ...base.source, report: old }, approved: new Set(['report_ready_teacher']) });
    expect(out.map((m) => m.template_key)).toEqual(['report_ready']);
  });

  it('the teacher is still told when the close render runs within the slack (a slow poll)', () => {
    const late = new Date(Date.parse('2026-09-29T14:41:00Z') + (30 + 1 + 60) * 60_000);
    const approved = new Set(['report_ready_teacher']);
    expect(readyMessages({ ...base, approved, now: late })).toHaveLength(2);
    const past = new Date(late.getTime() + 1000);
    expect(readyMessages({ ...base, approved, now: past })).toHaveLength(1);
  });

  it('the same report renders twice (an edit): the same dedup keys, so nothing is sent twice', () => {
    const approved = new Set(['report_ready_family', 'report_ready_teacher']);
    const first = readyMessages({ ...base, approved }).map((m) => m.dedup_key);
    const now = new Date(NOW.getTime() + 30_000);
    const again = readyMessages({ ...base, approved, now }).map((m) => m.dedup_key);
    expect(again).toEqual(first);
  });
});
