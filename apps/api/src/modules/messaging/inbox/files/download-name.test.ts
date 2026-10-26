import { describe, expect, it } from 'vitest';
import { downloadName } from './download-name';

const AT = '2026-10-26T14:32:09.000Z';

describe('downloadName: what «تنزيل» saves a bubble file as', () => {
  it('a sent file keeps its own name', () => {
    expect(downloadName({ media_name: ' فاتورة أكتوبر.pdf ', media_mime: 'application/pdf', created_at: AT })).toBe('فاتورة أكتوبر.pdf');
  });

  it('a family photo (no name) gets a UTC stamp and the extension of its type', () => {
    expect(downloadName({ media_name: null, media_mime: 'image/jpeg', created_at: AT })).toBe('whatsapp-2026-10-26-1432.jpg');
  });

  it('a voice note with codec parameters and no name column at all', () => {
    expect(downloadName({ media_mime: 'audio/ogg; codecs=opus', created_at: AT })).toBe('whatsapp-2026-10-26-1432.ogg');
  });

  it('a blank name falls back too', () => {
    expect(downloadName({ media_name: '  ', media_mime: 'video/mp4', created_at: AT })).toBe('whatsapp-2026-10-26-1432.mp4');
  });
});
