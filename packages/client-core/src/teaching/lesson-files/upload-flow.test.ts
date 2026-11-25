import { describe, expect, it, vi } from 'vitest';
import { pickProblem, titleOf, uploadLessonFile, type UploadDeps } from '.';

const signed = { bucket: 'report-attachments', path: 'L/x.pdf', token: 't', signed_url: 'u' };
const file = { name: 'صفحة الحفظ.pdf', mime: 'application/pdf', size: 1000, body: new Uint8Array(1) };

const deps = (error: Error | null = null) => ({
  api: {
    uploadUrl: vi.fn().mockResolvedValue(signed),
    register: vi.fn().mockResolvedValue({ id: 'F' }),
  },
  upload: vi.fn().mockResolvedValue({ error }),
}) satisfies UploadDeps;

describe('pickProblem', () => {
  it('lets a bucket type through and names the refusal otherwise', () => {
    expect(pickProblem({ mime: 'image/png', size: 10 })).toBeNull();
    expect(pickProblem({ mime: 'video/mp4', size: 10 })).toBe('type');
    expect(pickProblem({ mime: 'audio/mpeg', size: 31 * 1024 * 1024 })).toBe('too_large');
  });
});

describe('titleOf', () => {
  it('drops the extension and keeps a bare name', () => {
    expect(titleOf('صفحة الحفظ.pdf')).toBe('صفحة الحفظ');
    expect(titleOf('.pdf')).toBe('.pdf');
  });
});

describe('uploadLessonFile', () => {
  it('asks for a slot, uploads, then registers the path with its title', async () => {
    const d = deps();
    await uploadLessonFile(d, { lessonId: 'L', kind: 'homework', file, visible: true });
    expect(d.api.uploadUrl).toHaveBeenCalledWith({
      lessonId: 'L', file: { mime: 'application/pdf', size: 1000, kind: 'homework' },
    });
    expect(d.upload).toHaveBeenCalledWith(signed, { body: file.body, contentType: 'application/pdf' });
    expect(d.api.register).toHaveBeenCalledWith({
      lessonId: 'L',
      file: expect.objectContaining({ path: 'L/x.pdf', title: 'صفحة الحفظ', visible_to_family: true }),
    });
  });

  it('stops when the storage refused the file', async () => {
    const d = deps(new Error('403'));
    await expect(uploadLessonFile(d, { lessonId: 'L', kind: 'homework', file, visible: false }))
      .rejects.toThrow('403');
    expect(d.api.register).not.toHaveBeenCalled();
  });
});
