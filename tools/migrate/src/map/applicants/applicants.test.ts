// job_applicants from invented conversation and reply rows (C4).
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { bundleOf, row } from '../../sources/sheets/fixtures.ts';
import { jobApplicantsModule, mapJobApplicants } from './applicants.ts';

const conv = (fields: Record<string, string | null>) =>
  row({
    phone: '+20 10 11110001',
    name: 'أ. سلمى',
    status: 'توظيف / عرض خدمة',
    summary: 'معلمة تجويد، عندها إجازة',
    ...fields,
  });

describe('job applicants', () => {
  it('one applicant per phone from conversations and replies; notes from the summary', () => {
    const out = mapJobApplicants(
      bundleOf({
        hub_conversations: [
          conv({}),
          conv({ phone: '+966 55 111 0009', status: 'مهتم بدون ميعاد' }),
        ],
        book_conversations: [conv({ name: null })],
        hub_job_replies: [
          row({ name: '—', phone: '+20 10 11110001', message: 'رد الأكاديمية' }),
          row({ name: '—', phone: '+20 10 11110002', message: 'رد الأكاديمية' }),
        ],
      }),
    );
    expect(out.map((m) => (m.ok ? [m.key, m.value.columns] : null))).toEqual([
      [
        keys.jobApplicant('+201011110001'),
        {
          phone_e164: '+201011110001',
          name: 'أ. سلمى',
          status: 'new',
          notes: 'معلمة تجويد، عندها إجازة',
        },
      ],
      [
        keys.jobApplicant('+201011110002'),
        { phone_e164: '+201011110002', name: null, status: 'new', notes: null },
      ],
    ]);
    expect(jobApplicantsModule.adoptBy).toBe('phone_e164');
  });

  it('rejects text in the phone column and test rows', () => {
    const out = mapJobApplicants(
      bundleOf({
        hub_conversations: [conv({ phone: 'جروب الحلقة' }), conv({ name: 'Lorem ipsum' })],
      }),
    );
    expect(out.flatMap((m) => m.issues.map((i) => [i.code, i.severity]))).toEqual([
      ['bad_phone', 'reject'],
      ['test_row', 'reject'],
    ]);
  });
});
