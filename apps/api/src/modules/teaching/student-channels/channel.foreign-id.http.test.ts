import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, OTHER, ST, type Who } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const M = 'f6000000-0000-4000-8000-000000000002';
const PHOTO = { mime: 'image/jpeg', size: 2048, name: 'صفحة.jpg' };

/** Each audience's chat base, as a login outside that student's chat calls it. */
const FOREIGN: readonly (readonly [string, Who])[] = [
  [`/portal/students/${ST}/channel`, 'otherGuardian'],
  [`/portal/students/${OTHER}/channel`, 'guardian'],
  [`/portal/students/${OTHER}/channel`, 'student'],
  [`/teachers/me/channels/${ST}`, 'oldTeacher'],
  [`/sales/students/${ST}/channel`, 'otherSales'],
];

// A login that is not in this student's chat (another family, the former teacher, another
// assistant) learns nothing about it and writes nothing to it: 404, and no read or write runs.
describe('student channel: someone else’s student id', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('«معلومات الرسالة» of another chat is 404 and reads no marks', async () => {
    for (const [base, who] of FOREIGN) {
      const res = await t.call('GET', `${base}/messages/${M}/reads`, who);
      expect([base, who, res.statusCode]).toEqual([base, who, 404]);
    }
    expect(t.reads.marks).not.toHaveBeenCalled();
    expect(t.edits.message).not.toHaveBeenCalled();
  });

  it('marking another chat read is 404 and sets no read mark', async () => {
    for (const [base, who] of FOREIGN) {
      const res = await t.post(`${base}/read`, who, {});
      expect([base, who, res.statusCode]).toEqual([base, who, 404]);
    }
    expect(t.queries.setReadMark).not.toHaveBeenCalled();
  });

  it('an upload slot in another chat is 404 and signs nothing', async () => {
    for (const [base, who] of FOREIGN) {
      const res = await t.post(`${base}/attachments/upload-url`, who, PHOTO);
      expect([base, who, res.statusCode]).toEqual([base, who, 404]);
    }
    expect(t.storage.signedUpload).not.toHaveBeenCalled();
  });

  it('the unread count and presence of another chat are 404', async () => {
    const urls = FOREIGN.filter(([base]) => !base.startsWith('/teachers/'));
    for (const [base, who] of urls) {
      const res = await t.call('GET', `${base}/unread`, who);
      expect([base, who, res.statusCode]).toEqual([base, who, 404]);
    }
    for (const [base, who] of FOREIGN) {
      const res = await t.call('GET', `${base}/presence`, who);
      expect([base, who, res.statusCode]).toEqual([base, who, 404]);
    }
  });
});
