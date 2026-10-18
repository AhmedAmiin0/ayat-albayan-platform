import { ar, expect, test } from '../support/fixtures';
import { bubble, inboundRows, openThread, pushesForPhone, stubInboundMedia } from '../support/inbox';
import { freshDigits, seedLead } from '../support/messages';
import { stubReset } from '../support/wa-stub';

// Inbound media (R-MSG-05, R-MSG-06): a photo and a file from a lead show as bubbles named by
// kind with their caption (the file itself is fetched from Meta only when an admin needs it), and
// the admin gets a new_message push. «Meta» is tools/wa-stub; nothing is sent back.

/** A 1×1 PNG and a tiny PDF, made in memory (no binary fixtures in the repo). */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
).toString('base64');
const PDF = Buffer.from('%PDF-1.1\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF').toString('base64');

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
    await expect(bubble(log, photo)).toContainText(ar.inbox.media.image);
    await expect(bubble(log, photo)).toContainText(ar.inbox.mediaNotDownloaded);
    await expect(bubble(log, file)).toContainText(ar.inbox.media.document);
    await expect(bubble(log, file)).toContainText(ar.inbox.mediaNotDownloaded);
    // Theirs, not ours: no delivery ticks and no retry actions on an inbound bubble. The ticks are the
    // only role=img a bubble can hold (a not-downloaded file is a text line), so any image is ticks.
    await expect(bubble(log, photo).getByRole('img')).toHaveCount(0);
    await expect(bubble(log, file).getByRole('button')).toHaveCount(0);

    // The list preview names the kind, and a push row (one per phone per 10 minutes) exists.
    await admin.goto('/admin/inbox');
    const row = admin.getByRole('link', { name: ar.inbox.openThread.replace('{name}', name) });
    await expect(row).toContainText(ar.inbox.media.document);
    await expect.poll(() => pushesForPhone({ phone, kind: 'new_message' })).toBeGreaterThan(0);
  });
});
