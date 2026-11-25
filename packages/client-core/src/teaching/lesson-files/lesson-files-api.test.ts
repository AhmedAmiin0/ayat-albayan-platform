import { describe, expect, it, vi } from 'vitest';
import { lessonFilesApi, portalAssetsApi, partsByLesson, recordingMonths } from '.';

const view = {
  id: 'F', lesson_id: 'L', kind: 'homework', title: null, mime: 'image/png', size: 1,
  media: 'image', visible_to_family: false, created_at: '2026-11-16T17:00:00.000Z',
};
const rec = (id: string, lesson: string, at: string) => ({
  id, lesson_id: lesson, report_id: null, lesson_starts_at: at, teacher: null,
  duration_seconds: 60, size_bytes: null, media: 'audio' as const,
});

describe('lessonFilesApi', () => {
  it('patches the visibility and parses the answer', async () => {
    const client = { apiFetch: vi.fn(), apiSend: vi.fn().mockResolvedValue(view) };
    const out = await lessonFilesApi(client).setVisible({ id: 'F', visible: false });
    expect(client.apiSend).toHaveBeenCalledWith('PATCH', '/lesson-files/F/visibility', { visible: false });
    expect(out.visible_to_family).toBe(false);
  });

  it('reads the lesson page under its path key', () => {
    const client = { apiFetch: vi.fn(), apiSend: vi.fn() };
    expect(lessonFilesApi(client).lessonAssetsQuery('L').queryKey).toEqual(['lesson-files', 'L']);
  });
});

describe('portalAssetsApi', () => {
  it('posts for a lesson file link', async () => {
    const client = { apiFetch: vi.fn(), apiSend: vi.fn().mockResolvedValue({ url: 'u', expires_at: 'x' }) };
    await portalAssetsApi(client).lessonFileUrl({ studentId: 'S', fileId: 'F' });
    expect(client.apiSend).toHaveBeenCalledWith('POST', '/portal/students/S/lesson-files/F/url');
  });

  it('asks for a saving link under the file’s name («تنزيل»)', async () => {
    const client = { apiFetch: vi.fn(), apiSend: vi.fn().mockResolvedValue({ url: 'u', expires_at: 'x' }) };
    await portalAssetsApi(client).lessonFileUrl({ studentId: 'S', fileId: 'F', download: 'ورقة 1.png' });
    const path = `/portal/students/S/lesson-files/F/url?download=${encodeURIComponent('ورقة 1.png').replace('%20', '+')}`;
    expect(client.apiSend).toHaveBeenCalledWith('POST', path);
  });
});

describe('recording months and parts', () => {
  it('groups by the family month and counts a lesson’s parts', () => {
    const rows = [
      rec('A', 'L1', '2026-11-15T14:00:00.000Z'),
      rec('B', 'L1', '2026-11-15T14:00:00.000Z'),
      rec('C', 'L2', '2026-10-30T22:30:00.000Z'),
    ];
    expect(recordingMonths(rows, 'Asia/Riyadh').map((m) => m.month)).toEqual(['2026-11', '2026-10']);
    expect(partsByLesson(rows).get('L1')).toBe(2);
  });
});
