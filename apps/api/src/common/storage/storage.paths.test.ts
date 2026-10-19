import { describe, expect, it } from 'vitest';
import { ATTACHMENT_MIMES, RECEIPT_MIMES } from '@ab/shared';
import {
  attachmentPath,
  BUCKETS,
  chatName,
  chatOutPath,
  isChatOutPathOf,
  extFor,
  invoicePath,
  isPathOf,
  receiptPath,
  teacherReceiptPath,
  reportPdfPath,
  uploadName,
  waMediaPath,
} from './storage.paths';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('storage paths (migration 122 policies parse these)', () => {
  it('report PDF: {student_id}/{lesson_id}.pdf (R-REP-03)', () => {
    expect(reportPdfPath({ studentId: 's1', lessonId: 'l1' })).toBe('s1/l1.pdf');
  });

  it('attachment and receipt: {owner}/{uuid}.{ext}, a new name per upload', () => {
    const a = attachmentPath({ reportId: 'r1', mime: 'audio/mpeg' });
    const [owner, file] = a.split('/');
    expect(owner).toBe('r1');
    expect(file?.replace(/\.mp3$/, '')).toMatch(UUID);
    expect(attachmentPath({ reportId: 'r1', mime: 'audio/mpeg' })).not.toBe(a);
    expect(receiptPath({ subscriptionId: 'sub', mime: 'image/jpeg' })).toMatch(/^sub\/[0-9a-f-]{36}\.jpg$/);
    expect(teacherReceiptPath({ teacherId: 'tch', mime: 'application/pdf' })).toMatch(/^tch\/[0-9a-f-]{36}\.pdf$/);
  });

  it('invoice: {client_request_id}/{name}; a chat copy has a deterministic name, an upload a new one', () => {
    const requestId = 'req';
    expect(invoicePath({ requestId, name: chatName('m1', 'image/png') })).toBe('req/wa-m1.png');
    expect(chatName('m1', 'application/pdf')).toBe(chatName('m1', 'application/pdf'));
    expect(uploadName('image/jpeg')).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(uploadName('image/jpeg')).not.toBe(uploadName('image/jpeg'));
    expect(isPathOf(invoicePath({ requestId, name: uploadName('image/png') }), requestId)).toBe(true);
  });

  it('wa-media cache: {message_id}.{ext}; the buckets are named once', () => {
    expect(waMediaPath({ messageId: 'm1', mime: 'image/webp' })).toBe('m1.webp');
    expect(BUCKETS).toMatchObject({ invoices: 'invoices', waMedia: 'wa-media', recordings: 'recordings' });
  });

  it('every accepted mime has a real extension', () => {
    for (const mime of [...ATTACHMENT_MIMES, ...RECEIPT_MIMES]) expect(extFor(mime)).not.toBe('bin');
    expect(extFor('application/zip')).toBe('bin');
    expect([extFor('video/mp4'), extFor('video/3gpp'), extFor('audio/amr')]).toEqual(['mp4', '3gp', 'amr']);
  });

  it.each([
    ['sub/abc.jpg', 'sub', true],
    ['other/abc.jpg', 'sub', false],
    ['sub/', 'sub', false],
    ['sub', 'sub', false],
    ['sub/x/abc.jpg', 'sub', false],
    ['../sub/abc.jpg', 'sub', false],
  ])('isPathOf(%s, %s) → %s', (path, owner, ok) => {
    expect(isPathOf(path, owner)).toBe(ok);
  });

  it('chatOutPath is out/{actor}/{request}/{uuid}.{ext}', () => {
    expect(chatOutPath({ actorId: 'u1', requestId: 'r1', mime: 'application/pdf' })).toMatch(/^out\/u1\/r1\/[0-9a-f-]{36}\.pdf$/);
  });

  it.each([
    ['out/u1/r1/a.png', true],
    ['out/u2/r1/a.png', false],
    ['out/u1/r2/a.png', false],
    ['out/u1/r1/', false],
    ['out/u1/r1/x/a.png', false],
    ['in/u1/r1/a.png', false],
    ['out/u1/r1/..', false],
  ])('isChatOutPathOf(%s) → %s', (path, ok) => {
    expect(isChatOutPathOf(path, { actorId: 'u1', requestId: 'r1' })).toBe(ok);
  });
});
