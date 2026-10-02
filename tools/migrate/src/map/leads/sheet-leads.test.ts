import { describe, expect, it } from 'vitest';
import { SA, SA2, sheetRow } from './fixtures.ts';
import { sheetLeads } from './sheet-leads.ts';

const row = (fields: Record<string, string | number | null>, n = 2) => sheetRow(fields, n);

describe('sheetLeads («كل المحادثات»)', () => {
  it('folds HUB and BOOK rows per phone, HUB first, gaps filled from BOOK', () => {
    const r = sheetLeads({
      sheets: {
        hub_conversations: [
          row({ phone: SA, name: 'سارة', status: 'مهتم بدون ميعاد', source: null }),
        ],
        book_conversations: [
          row({
            phone: `+${SA}`,
            name: 'other',
            status: 'حجز مؤكد',
            source: 'إعلان انستجرام',
            summary: 's',
          }),
        ],
      },
    });
    const lead = r.byPhone.get(`+${SA}`);
    expect(lead?.name).toBe('سارة');
    expect(lead?.status).toBe('interested_no_slot');
    expect(lead?.source).toBe('instagram_ad');
    expect(lead?.summary).toBe('s');
    expect(r.issues).toEqual([]);
  });

  it('keeps job rows marked, skips group and internal rows', () => {
    const r = sheetLeads({
      sheets: {
        hub_conversations: [
          row({ phone: SA, status: 'توظيف / عرض خدمة' }),
          row({ phone: SA2, status: 'جروب حلقة' }),
          row({ phone: '966551110009', status: 'مهتم بدون ميعاد', source: 'داخلي' }),
        ],
      },
    });
    expect(r.byPhone.get(`+${SA}`)?.status).toBe('job_applicant');
    expect(r.byPhone.size).toBe(1);
  });

  it('reports bad phones (not for job rows) and unknown statuses', () => {
    const r = sheetLeads({
      sheets: {
        hub_conversations: [
          row({ phone: '#ERROR!', status: 'حجز مؤكد' }, 3),
          row({ phone: '@handle', status: 'توظيف / عرض خدمة' }, 4),
          row({ phone: SA, status: 'حالة جديدة' }, 5),
        ],
      },
    });
    expect(r.issues.map((i) => [i.code, i.severity, i.ref.row])).toEqual([
      ['bad_phone', 'reject', 3],
      ['unmapped_value', 'warn', 5],
    ]);
    expect(r.byPhone.get(`+${SA}`)?.status).toBeUndefined();
  });

  it('keeps only the day of a date', () => {
    const r = sheetLeads({
      sheets: {
        hub_conversations: [
          row({ phone: SA, date: '2026-09-03T14:20:00' }),
          row({ phone: SA2, date: 'أمس' }),
        ],
      },
    });
    expect(r.byPhone.get(`+${SA}`)?.date).toBe('2026-09-03');
    expect(r.byPhone.get(`+${SA2}`)?.date).toBeNull();
  });
});
