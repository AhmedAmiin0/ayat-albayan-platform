import { describe, expect, it } from 'vitest';
import { matchesUpload } from './channel-upload-check';

const FILE = {
  mime: 'image/jpeg' as const,
  size: 2048,
  name: 'p.jpg',
  path: 'c3000000-0000-4000-8000-000000000001/f.jpg',
};
const STORED = { size: 2048, contentType: 'image/jpeg' };

describe('a posted attachment against its stored object', () => {
  it('accepts the file as uploaded, whatever the content type parameters', () => {
    expect(matchesUpload(FILE, STORED)).toBe(true);
    expect(matchesUpload(FILE, { ...STORED, contentType: 'Image/JPEG; q=1' })).toBe(true);
  });

  it('refuses a missing object, another type, another size or a renamed extension', () => {
    expect(matchesUpload(FILE, null)).toBe(false);
    expect(matchesUpload(FILE, { ...STORED, contentType: 'application/pdf' })).toBe(false);
    expect(matchesUpload(FILE, { ...STORED, size: 2049 })).toBe(false);
    expect(matchesUpload({ ...FILE, path: FILE.path.replace('.jpg', '.pdf') }, STORED)).toBe(false);
  });

  it("refuses an object over its type's cap even when the claim matches it", () => {
    const big = 12 * 1024 * 1024;
    expect(matchesUpload({ ...FILE, size: big }, { ...STORED, size: big })).toBe(false);
    const pdf = { ...FILE, mime: 'application/pdf' as const, size: big, path: 'c/f.pdf' };
    expect(matchesUpload(pdf, { size: big, contentType: 'application/pdf' })).toBe(true);
  });
});
