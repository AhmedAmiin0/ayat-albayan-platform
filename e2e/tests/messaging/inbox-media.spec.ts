import { ar, expect, test } from '../../support/core/fixtures';
import { bubble, inboundRows, openThread, pushesForPhone, stubInboundMedia } from '../../support/messaging/inbox';
import { freshDigits, seedLead } from '../../support/messages';
import { stubReset } from '../../support/wa-stub';

// Inbound media (R-MSG-05, R-MSG-06): a photo and a file from a lead show as bubbles named by
// kind with their caption (the file itself is fetched from Meta only when «عرض …» is clicked, W6), and
// the admin gets a new_message push. «Meta» is tools/wa-stub; nothing is sent back.

/** A 1×1 PNG and a tiny PDF, made in memory (no binary fixtures in the repo). */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
).toString('base64');
const PDF = Buffer.from('%PDF-1.1\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF').toString('base64');
/** A real 0.1 s Ogg Opus voice note (191 bytes, ffmpeg anullsrc), so the player does not fall back to the link. */
const OGG =
  'T2dnUwACAAAAAAAAAAAAAAAAAAAAAAIotXIBE09wdXNIZWFkAQE4AYC7AAAAAABPZ2dTAAAAAAAAAAAAAAAAAAABAAAASZW+VAEuT3B1c1RhZ3MGAAAAZmZtcGVnAQAAABQAAABl' +
  'bmNvZGVyPUxhdmMgbGlib3B1c09nZ1MABPgTAAAAAAAAAAAAAAIAAABBShkFBgcGBgYGBggL5jsjq2AICKyzDsYICKyzDsYICKyzDsYICKyzDsYICKyzDsY=';

test.describe('inbox — inbound media (R-MSG-05)', () => {
  test.beforeEach(async () => {
    await stubReset();
  });

  test('an image and a PDF from a lead → two bubbles with kind + caption, mime stored, push row', async ({ asRole }) => {
    test.setTimeout(90_000);
    const digits = freshDigits();
    const phone = `+${digits}`;
    const name = `أم نور ${digits.slice(-4)}`;
    await seedLead({ phone, name });
    const photo = `صورة الاستمارة ${digits.slice(-4)}`;
    const file = `إيصال التحويل ${digits.slice(-4)}`;
    const media = { from: digits, name };
    expect((await stubInboundMedia({ ...media, media: { kind: 'image', mime: 'image/png', caption: photo, base64: PNG } })).status).toBe(200);
    expect(
      (await stubInboundMedia({ ...media, media: { kind: 'document', mime: 'application/pdf', caption: file, filename: 'receipt.pdf', base64: PDF } })).status,
    ).toBe(200);

    await expect.poll(async () => (await inboundRows(phone)).map((r) => r.media_mime)).toEqual(['image/png', 'application/pdf']);
    const [image, document] = await inboundRows(phone);
    expect([image?.body, document?.body]).toEqual([photo, file]);

    const admin = await asRole('admin');
    const log = await openThread(admin, name);
    // W6: each file is a «عرض …» button; nothing is fetched until it is clicked.
    const viewPhoto = bubble(log, photo).getByRole('button', { name: ar.inbox.viewMedia.replace('{kind}', ar.inbox.media.image) });
    const viewFile = bubble(log, file).getByRole('button', { name: ar.inbox.viewMedia.replace('{kind}', ar.inbox.media.document) });
    await expect(viewPhoto).toBeVisible();
    await expect(viewFile).toBeVisible();
    // Theirs, not ours: no delivery ticks and no retry actions on an inbound bubble. Before a click the
    // ticks are the only role=img a bubble can hold, and «عرض …» its only button.
    await expect(bubble(log, photo).getByRole('img')).toHaveCount(0);
    await expect(bubble(log, file).getByRole('button')).toHaveCount(1);

    // A click downloads it from «Meta» (the stub) into our bucket: a thumbnail for the photo, a link for the PDF.
    await viewPhoto.click();
    const thumb = bubble(log, photo).getByRole('img', { name: ar.inbox.openMedia.replace('{kind}', ar.inbox.media.image) });
    await expect.poll(() => thumb.evaluate((i) => (i as unknown as { naturalWidth: number }).naturalWidth), { timeout: 30_000 }).toBeGreaterThan(0);
    await viewFile.click();
    const pdf = bubble(log, file).getByRole('link', { name: ar.inbox.openMedia.replace('{kind}', ar.inbox.media.document) });
    await expect(pdf).toHaveAttribute('target', '_blank', { timeout: 30_000 });
    await expect(bubble(log, file).getByText(ar.inbox.mediaExpired)).toHaveCount(0);

    // The list preview names the kind, and a push row (one per phone per 10 minutes) exists.
    await admin.goto('/admin/inbox');
    const row = admin.getByRole('link', { name: ar.inbox.openThread.replace('{name}', name) });
    await expect(row).toContainText(ar.inbox.media.document);
    await expect.poll(() => pushesForPhone({ phone, kind: 'new_message' })).toBeGreaterThan(0);
  });

  // docs/21 D1: a voice note plays in the chat. «تشغيل رسالة صوتية» fetches it (W6), then an <audio> with the signed URL.
  test('a voice note from a lead → «تشغيل رسالة صوتية», then an audio player with a src', async ({ asRole }) => {
    test.setTimeout(90_000);
    const digits = freshDigits();
    const phone = `+${digits}`;
    const name = `أم سلمى ${digits.slice(-4)}`;
    await seedLead({ phone, name });
    const voice = { kind: 'audio', mime: 'audio/ogg; codecs=opus', base64: OGG } as const;
    expect((await stubInboundMedia({ from: digits, name, media: voice })).status).toBe(200);
    await expect.poll(async () => (await inboundRows(phone)).map((r) => r.media_mime)).toEqual([voice.mime]);

    const log = await openThread(await asRole('admin'), name);
    const play = log.getByRole('button', { name: ar.inbox.playMedia.replace('{kind}', ar.inbox.media.audio) });
    await expect(play).toBeVisible();
    await expect(log.locator('audio')).toHaveCount(0);
    await play.click();
    await expect(log.locator('audio')).toHaveAttribute('src', /^https?:\/\/.+/, { timeout: 30_000 });
    await expect(log.getByText(ar.inbox.mediaExpired)).toHaveCount(0);
  });
});
