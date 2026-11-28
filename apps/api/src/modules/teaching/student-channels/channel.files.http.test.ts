import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CH, channelApp, messageRow, ST } from './channel.fakes';
import { UPLOADED } from './testing/channel-extras.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const TEACHER = `/teachers/me/channels/${ST}`;
const PORTAL = `/portal/students/${ST}/channel`;
const SALES = `/sales/students/${ST}/channel`;
const PHOTO = { mime: 'image/jpeg', size: 2048, name: 'صفحة.jpg' };

// The chat upgrade (docs/31 §2): photos, PDFs and voice notes through a signed upload into the
// channel's own folder of the private channel-media bucket.
describe('student channel files over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.queries.isOpen.mockResolvedValue(true);
  });

  it('upload-url: a participant gets a one-off slot in the channel folder, sized and typed', async () => {
    for (const [base, who] of [
      [TEACHER, 'teacher'],
      [PORTAL, 'guardian'],
      [SALES, 'sales'],
    ] as const) {
      const res = await t.post(`${base}/attachments/upload-url`, who, PHOTO);
      expect([who, res.statusCode]).toEqual([who, 201]);
      expect(res.json().path).toMatch(new RegExp(`^${CH}/[0-9a-f-]{36}\\.jpg$`));
    }
    expect(t.storage.signedUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'channel-media',
        file: { size: 2048, mime: 'image/jpeg' },
      }),
    );
  });

  it('upload-url: another type or an oversize file is 400; a closed channel 409; a monitor 403', async () => {
    const bad = [
      { ...PHOTO, mime: 'video/mp4' },
      { ...PHOTO, size: 10 * 1024 * 1024 + 1 },
    ];
    for (const file of bad) {
      expect((await t.post(`${PORTAL}/attachments/upload-url`, 'guardian', file)).statusCode).toBe(
        400,
      );
    }
    t.queries.isOpen.mockResolvedValue(false);
    const closed = await t.post(`${PORTAL}/attachments/upload-url`, 'guardian', PHOTO);
    expect([closed.statusCode, closed.json().code]).toEqual([409, 'channel_not_open']);
    // A closed chat leaves the assistant a monitor: no upload.
    expect((await t.post(`${SALES}/attachments/upload-url`, 'sales', PHOTO)).statusCode).toBe(403);
    expect(t.storage.signedUpload).not.toHaveBeenCalled();
  });

  it('a photo without a caption is stored as kind photo with its file, and served with a link', async () => {
    const attachment = { ...PHOTO, path: UPLOADED };
    const res = await t.post(`${PORTAL}/messages`, 'guardian', { attachment });
    expect(res.statusCode).toBe(201);
    expect(t.queries.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        body: '',
        kind: 'photo',
        attachment_path: UPLOADED,
        attachment_mime: 'image/jpeg',
        attachment_size: 2048,
        attachment_name: 'صفحة.jpg',
        attachment_duration_ms: null,
      }),
    );
    expect(res.json()).toMatchObject({
      kind: 'photo',
      attachment: {
        mime: 'image/jpeg',
        size: 2048,
        name: 'صفحة.jpg',
        url: `https://storage.test/get/${UPLOADED}`,
      },
    });
    expect(t.push.notifyProfiles).toHaveBeenCalledWith(
      expect.objectContaining({
        vars: expect.objectContaining({ text: 'صورة' }),
      }),
    );
  });

  it('a file not in this channel folder, or never uploaded, is 400 attachment_path', async () => {
    const elsewhere = { ...PHOTO, path: 'c3000000-0000-4000-8000-000000000009/f.jpg' };
    const missing = { ...PHOTO, path: `${CH}/never.jpg` };
    for (const attachment of [elsewhere, missing]) {
      const res = await t.post(`${PORTAL}/messages`, 'guardian', { attachment });
      expect([res.statusCode, res.json().code]).toEqual([400, 'attachment_path']);
    }
    expect(t.queries.insert).not.toHaveBeenCalled();
  });

  it('a stored object that is not the claimed file (type or size) is 400 attachment_path', async () => {
    const claims = [
      { ...PHOTO, size: 1024 },
      { ...PHOTO, mime: 'image/png' },
    ];
    for (const claim of claims) {
      const res = await t.post(`${PORTAL}/messages`, 'guardian', {
        attachment: { ...claim, path: UPLOADED },
      });
      expect([res.statusCode, res.json().code]).toEqual([400, 'attachment_path']);
    }
    expect(t.storage.info).toHaveBeenCalledWith({ bucket: 'channel-media', path: UPLOADED });
    expect(t.queries.insert).not.toHaveBeenCalled();
  });

  it('a page signs its files once; a file deleted for everyone has no link', async () => {
    const file = { kind: 'voice', attachment_path: UPLOADED, attachment_mime: 'audio/mp4' };
    const extra = { attachment_size: 9, attachment_name: 'v.m4a', attachment_duration_ms: 4200 };
    t.queries.page.mockResolvedValueOnce([
      messageRow({ id: 'a', ...file, ...extra }),
      messageRow({ id: 'b', ...file, ...extra, deleted_at: '2026-10-27T11:00:00.000Z' }),
    ]);
    const page = (await t.call('GET', `${TEACHER}/messages`, 'teacher')).json();
    expect(
      page.messages.map((m: { attachment: { url: string | null } }) => m.attachment.url),
    ).toEqual([null, `https://storage.test/get/${UPLOADED}`]);
    expect(page.messages[1].attachment.duration_ms).toBe(4200);
    expect(t.storage.signedDownloads).toHaveBeenCalledWith({
      bucket: 'channel-media',
      paths: [UPLOADED],
      seconds: 3600,
    });
  });
});
