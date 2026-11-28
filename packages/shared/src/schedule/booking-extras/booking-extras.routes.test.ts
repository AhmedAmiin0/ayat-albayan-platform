import { describe, expect, it } from 'vitest';
import { bookingExtraRoutes as routes } from './booking-extras.routes';

const STUDENT = 'e1111111-1111-4111-8111-111111111111';
const REQ = 'e2222222-2222-4222-8222-222222222222';
const MISSED = {
  lesson_id: 'l-1',
  starts_at: '2026-09-13T14:00:00.000Z',
  status: 'no_show',
  duration_min: 30,
  teacher: { id: 't-1', display_name_ar: 'فاطمة' },
};

describe('bookingExtraRoutes (R-SCH-10, R-PAY-03)', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['GET /booking/makeup-candidates', 'POST /booking/invoice-upload-url']);
  });

  it('lists the missed lessons of one student, named by a uuid', () => {
    const { query } = routes.makeupCandidates;
    expect(query.parse({ studentId: STUDENT })).toEqual({ studentId: STUDENT });
    expect(query.safeParse({}).success).toBe(false);
    expect(query.safeParse({ studentId: 's-1' }).success).toBe(false);
  });

  it('answers each missed lesson with its teacher', () => {
    const { response } = routes.makeupCandidates;
    expect(response.parse([MISSED])).toEqual([MISSED]);
    expect(response.safeParse([{ ...MISSED, status: 'later' }]).success).toBe(false);
    expect(response.safeParse([{ ...MISSED, teacher: null }]).success).toBe(false);
  });

  it('asks a signed upload for one invoice file and answers where to put it', () => {
    const body = { clientRequestId: REQ, mime: 'application/pdf', size: 7 };
    expect(routes.invoiceUploadUrl.body.parse(body)).toEqual(body);
    expect(routes.invoiceUploadUrl.body.safeParse({ ...body, mime: 'text/plain' }).success).toBe(
      false,
    );
    const signed = { bucket: 'invoices', path: 'r/a.pdf', token: 'tok', signed_url: 'https://x' };
    expect(routes.invoiceUploadUrl.response.parse(signed)).toEqual(signed);
  });
});
