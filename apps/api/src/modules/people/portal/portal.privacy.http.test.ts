import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { keysOf, L1, portalApp, R1, REC, S1 } from './portal.fakes';

type App = Awaited<ReturnType<typeof portalApp>>;
/** Money, notes, reasons, contacts and storage internals: none may leave these portal routes. */
const SECRET =
  /price|amount|currency|fx|paid|payment|invoice|note|reason|phone|email|path|egress|meeting_mode|secret|سر/i;

describe('/portal responses are whitelists (no money outside the package, notes or contacts)', () => {
  let t: App;
  beforeAll(async () => {
    // A fixed morning before the fixture lesson's join window (16:00 UTC, opens 15:50): under the real
    // clock that window is open on 2026-10-27 and the join link is shown by design (portal.join).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T08:00:00.000Z'));
    t = await portalApp();
  });
  afterAll(async () => {
    vi.useRealTimers();
    await t.app.close();
  });

  it('every read route', async () => {
    const urls = ['/portal/me', `/portal/students/${S1}/lessons`, `/portal/students/${S1}/reports`];
    for (const url of urls) {
      const res = await t.call('GET', url, 'guardianA');
      expect([url, res.statusCode]).toEqual([url, 200]);
      // The guardian login's own name and number are the one contact allowed.
      const { guardian, ...rest } = res.json();
      expect([url, keysOf(rest).filter((k) => SECRET.test(k))]).toEqual([url, []]);
      const own = url === '/portal/me' ? ['name', 'phone'] : [];
      expect([url, keysOf(guardian ?? {})]).toEqual([url, own]);
      expect(res.body).not.toMatch(/سر|\+20100|example\.org\/abc|x@example/);
    }
  });

  it("the lessons carry «ما المطلوب» from the newest sent report and this month's counts", async () => {
    const res = await t.call('GET', `/portal/students/${S1}/lessons`, 'student1');
    expect(res.json().prepare).toEqual({
      homework: 'سورة الملك',
      next_plan: null,
      report_id: R1,
      lesson_starts_at: '2026-10-20T16:00:00.000Z',
    });
    expect(res.json().month).toEqual({ attended: 1, absent: 0 });
    expect(t.reports.sent).toHaveBeenCalledWith(S1, 1);
    expect(t.reports.texts).toHaveBeenCalledWith(R1);
    t.reports.sent.mockResolvedValueOnce([]);
    const none = await t.call('GET', `/portal/students/${S1}/lessons`, 'student1');
    expect(none.json().prepare).toBeNull();
  });

  it('reports: sent ones newest first, with the visible recording id; no file path', async () => {
    const res = await t.call('GET', `/portal/students/${S1}/reports`, 'guardianA');
    expect(res.json()).toEqual({
      reports: [
        {
          id: R1,
          lesson_id: L1,
          lesson_starts_at: '2026-10-20T16:00:00.000Z',
          sent_at: '2026-10-20T18:00:00.000Z',
          teacher: { display_name_ar: 'أبرار', display_name_en: null },
          recording_id: REC,
        },
      ],
    });
    expect(t.reports.visibleRecordings).toHaveBeenCalledWith([L1]);
  });

  it('a file opens by a 5-minute signed link of the student’s own sent report', async () => {
    const res = await t.call('POST', `/portal/students/${S1}/reports/${R1}/url`, 'guardianA');
    expect(res.statusCode).toBe(200);
    expect(t.reports.oneSent).toHaveBeenCalledWith({ studentId: S1, reportId: R1 });
    expect(t.storage.signedDownload).toHaveBeenCalledWith({
      bucket: 'reports',
      path: `${S1}/${L1}.pdf`,
      seconds: 300,
    });
    t.reports.oneSent.mockResolvedValueOnce(null);
    expect(
      (await t.call('POST', `/portal/students/${S1}/reports/${R1}/url`, 'guardianA')).json().code,
    ).toBe('report_not_found');
  });

  it('a recording opens (an hour, for playback) only when it is visible to the student; otherwise 404', async () => {
    const ok = await t.call('POST', `/portal/students/${S1}/recordings/${REC}/url`, 'student1');
    expect(ok.statusCode).toBe(200);
    expect(t.storage.signedDownload).toHaveBeenLastCalledWith({
      bucket: 'recordings',
      path: `lessons/${L1}/a.mp4`,
      seconds: 3600,
    });
    t.reports.visibleRecordings.mockResolvedValueOnce([]);
    const hidden = await t.call('POST', `/portal/students/${S1}/recordings/${REC}/url`, 'student1');
    expect([hidden.statusCode, hidden.json().code]).toEqual([404, 'recording_not_found']);
  });
});
