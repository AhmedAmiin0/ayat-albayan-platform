import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PG_ERRORS } from '@/common/db/testing/db-answer';
import { stampDelivered } from '@/modules/messaging/whatsapp/messages/delivered.repo';

const AT = '2026-10-02T08:00:00Z';
const REPORT = 'report_ready:r1';

describe('stampDelivered', () => {
  it('stamps the lead and an unsent report', async () => {
    const f = fakeDb({ leads: [{}], lesson_reports: [{}] });
    await stampDelivered(f.db, { leadId: 'l1', dedupKey: REPORT, at: AT });
    expect(f.argsOf('leads', 'update')).toEqual([{ last_outbound_at: AT }]);
    expect(f.argsOf('lesson_reports', 'update')).toEqual([{ sent_at: AT }]);
    expect(f.argsOf('lesson_reports', 'is')).toEqual(['sent_at', null]);
  });

  it('no lead and no report key: no write', async () => {
    const f = fakeDb({});
    await stampDelivered(f.db, { leadId: null, dedupKey: 'other:1', at: AT });
    expect(f.trips).toEqual([]);
  });

  it('a failed write keeps its step in the error', async () => {
    const lead = fakeDb({ leads: [{ error: PG_ERRORS.other }] });
    await expect(stampDelivered(lead.db, { leadId: 'l1', dedupKey: null, at: AT })).rejects.toThrow(
      'lead last_outbound_at failed: boom',
    );
    const report = fakeDb({ lesson_reports: [{ error: PG_ERRORS.other }] });
    const input = { leadId: null, dedupKey: REPORT, at: AT };
    await expect(stampDelivered(report.db, input)).rejects.toThrow('report sent_at failed: boom');
  });
});
