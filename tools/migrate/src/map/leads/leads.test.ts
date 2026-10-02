// mapLeads over invented CRM + sheet rows: who becomes a lead, with which status, and who not.
import { describe, expect, it } from 'vitest';
import type { Mapped } from '../../types.ts';
import { EG, QA, SA, SA2, bundle, contact, crm, desired, message, sheetRow } from './fixtures.ts';
import { leadsModule, mapLeads } from './leads.ts';

const byKey = (out: Mapped[]) =>
  new Map(out.flatMap((m) => (m.ok ? [[m.key.key, m] as const] : [])));
const issuesOf = (out: Mapped[]) => out.flatMap((m) => m.issues.map((i) => [i.code, i.severity]));

describe('mapLeads', () => {
  const tables = crm({
    contacts: [
      contact('k1', SA, 'سارة'),
      contact('k2', EG, 'أم سليم'),
      contact('k3', QA, 'ولي أمر'),
      contact('k4', '', 'بدون رقم'),
      contact('k5', '966500000000', 'dummy'),
      contact('k6', SA2, 'معلمة'),
    ],
    tags: { k1: ['تجريبي محجوز', 'whatsapp', 'imported'], k2: ['جديد'] },
    messages: [
      message({
        id: 'm1',
        conv: 'c-k2',
        sender: 'customer',
        at: '2026-09-12T09:00:00+00:00',
        text: 'أنا محفظة ومجازة',
      }),
      message({ id: 'm2', conv: 'c-k2', sender: 'agent', at: '2026-09-12T10:00:00+00:00' }),
    ],
  });
  const out = mapLeads(
    bundle({
      crm: tables,
      earlier: new Map([
        ['guardians', [desired('guardians', `+${QA}`)]],
        ['teachers', [desired('teachers', 'hend', { phone_e164: `+${SA2}` })]],
      ]),
      sheets: {
        hub_conversations: [
          sheetRow({ phone: EG, status: 'حجز مؤكد', source: 'إعلان فيسبوك', summary: 'ملخص' }),
          sheetRow({ phone: '966551110007', name: 'ليلى', status: 'مردّش', date: '2026-08-20' }, 3),
          sheetRow({ phone: '966551110008', status: 'توظيف / عرض خدمة' }, 4),
          sheetRow({ phone: '966551110009', name: 'Lorem' }, 5),
        ],
      },
    }),
  );
  const leads = byKey(out);

  it('makes CRM contacts leads with the tag status and non-status tags kept', () => {
    const k1 = leads.get(`+${SA}`);
    expect(k1?.ref).toMatchObject({ source: 'CRM', tab: 'contacts', id: 'k1' });
    expect(k1?.ok && k1.value.columns).toMatchObject({
      name: 'سارة',
      status: 'trial_booked',
      source: 'whatsapp_direct',
      tz: 'Asia/Riyadh',
      qualification: { crm_tags: ['imported', 'whatsapp'] },
      created_at: '2026-09-12T08:00:00+00:00',
    });
  });

  it('fills status, source and summary from the sheet when the CRM only says «جديد»', () => {
    const k2 = leads.get(`+${EG}`);
    expect(k2?.ok && k2.value.columns).toMatchObject({
      status: 'trial_booked',
      source: 'facebook_ad',
      last_inbound_at: '2026-09-12T09:00:00+00:00',
      last_outbound_at: '2026-09-12T10:00:00+00:00',
    });
  });

  it('flags job-seeker wording for review but still imports the lead', () => {
    const k2 = leads.get(`+${EG}`);
    expect(k2?.issues).toMatchObject([
      { code: 'unmapped_value', severity: 'review', field: 'job_seeker' },
    ]);
    expect(k2?.ok && k2.value.columns['qualification']).toMatchObject({
      job_seeker_hints: ['self'],
    });
  });

  it('adds sheet-only phones as leads (gap fill)', () => {
    const l = leads.get('+966551110007');
    expect(l?.ref.source).toBe('HUB');
    expect(l?.ok && l.value.columns).toMatchObject({ name: 'ليلى', status: 'no_reply' });
  });

  it('gives guardians, teachers and job applicants no lead', () => {
    for (const p of [`+${QA}`, `+${SA2}`, '+966551110008']) expect(leads.has(p)).toBe(false);
  });

  it('rejects bad phones and A6 test rows', () => {
    expect(issuesOf(out)).toEqual(
      expect.arrayContaining([
        ['bad_phone', 'reject'],
        ['test_row', 'reject'],
      ]),
    );
    expect(issuesOf(out).filter(([c]) => c === 'test_row')).toHaveLength(2);
    expect(leads.size).toBe(3);
  });

  it('is pure: same input, same output', () => {
    expect(mapLeads(bundle({ crm: tables }))).toEqual(mapLeads(bundle({ crm: tables })));
  });

  it('adopts app-created leads by phone', () => {
    expect(leadsModule).toMatchObject({ entity: 'leads', table: 'leads', adoptBy: 'phone_e164' });
  });
});
