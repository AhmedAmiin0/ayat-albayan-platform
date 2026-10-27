import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { keysOf, L1, portalApp, R1, REC, S1 } from './portal.fakes';

type App = Awaited<ReturnType<typeof portalApp>>;
/** Money, notes, reasons, contacts and storage internals: none may leave a portal route. */
const SECRET = /price|amount|currency|fx|paid|payment|invoice|note|reason|phone|email|path|egress|meeting_mode|secret|سر/i;

describe('/portal responses are whitelists (no money, notes or contacts)', () => {
  let t: App;
  beforeAll(async () => {
    t = await portalApp();
    // Before the fixture lesson's join window (it opens 10 min before 16:00Z): no meeting link may show.
    // Without a pinned clock this failed on the real day of the fixture, inside the window.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T12:00:00.000Z'));
  });
  afterAll(async () => {
    vi.useRealTimers();
    await t.app.close();
  });

  it('every read route', async () => {
    const urls = ['/portal/me', `/portal/students/${S1}/lessons`, `/portal/students/${S1}/reports`, `/portal/students/${S1}/package`];
    for (const url of urls) {
      const res = await t.call('GET', url, 'guardianA');
      expect([url, res.statusCode]).toEqual([url, 200]);
      expect([url, keysOf(res.json()).filter((k) => SECRET.test(k))]).toEqual([url, []]);
      expect(res.body).not.toMatch(/سر|\+20100|example\.org\/abc|x@example/);
    }
  });

  it('the package: name, lessons left over all packages, renewal date and status only', async () => {
    const res = await t.call('GET', `/portal/students/${S1}/package`, 'student1');
    expect(res.json()).toEqual({
      package: { package: '8', duration: 30, lessons_total: 8, remaining: 5, starts_on: '2026-10-01', renews_on: '2026-11-01', status: 'active' },
    });
    expect(t.balances.forStudents).toHaveBeenCalledWith([S1]);
    t.balances.forStudents.mockResolvedValueOnce([{ subscription_id: 'p1', remaining: -2 }]);
    expect((await t.call('GET', `/portal/students/${S1}/package`, 'student1')).json().package.remaining).toBe(0);
    t.packages.packages.mockResolvedValueOnce([]);
    expect((await t.call('GET', `/portal/students/${S1}/package`, 'student1')).json()).toEqual({ package: null });
  });

  it('reports: sent ones newest first, with the visible recording id; no file path', async () => {
    const res = await t.call('GET', `/portal/students/${S1}/reports`, 'guardianA');
    expect(res.json()).toEqual({
      reports: [
        {
          id: R1, lesson_id: L1, lesson_starts_at: '2026-10-20T16:00:00.000Z', sent_at: '2026-10-20T18:00:00.000Z',
          teacher: { display_name_ar: 'أبرار', display_name_en: null }, recording_id: REC,
        },
      ],
    });
    expect(t.reports.visibleRecordings).toHaveBeenCalledWith([L1]);
  });

  it('a file opens by a 5-minute signed link of the student’s own sent report', async () => {
    const res = await t.call('POST', `/portal/students/${S1}/reports/${R1}/url`, 'guardianA');
    expect(res.statusCode).toBe(200);
    expect(t.reports.oneSent).toHaveBeenCalledWith({ studentId: S1, reportId: R1 });
    expect(t.storage.signedDownload).toHaveBeenCalledWith({ bucket: 'reports', path: `${S1}/${L1}.pdf`, seconds: 300 });
    t.reports.oneSent.mockResolvedValueOnce(null);
    expect((await t.call('POST', `/portal/students/${S1}/reports/${R1}/url`, 'guardianA')).json().code).toBe('report_not_found');
  });

  it('a recording opens (an hour, for playback) only when it is visible to the student; otherwise 404', async () => {
    const ok = await t.call('POST', `/portal/students/${S1}/recordings/${REC}/url`, 'student1');
    expect(ok.statusCode).toBe(200);
    expect(t.storage.signedDownload).toHaveBeenLastCalledWith({ bucket: 'recordings', path: `lessons/${L1}/a.mp4`, seconds: 3600 });
    t.reports.visibleRecordings.mockResolvedValueOnce([]);
    const hidden = await t.call('POST', `/portal/students/${S1}/recordings/${REC}/url`, 'student1');
    expect([hidden.statusCode, hidden.json().code]).toEqual([404, 'recording_not_found']);
  });
});
