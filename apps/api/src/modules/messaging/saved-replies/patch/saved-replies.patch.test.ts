import { describe, expect, it } from 'vitest';
import { attachmentColumns, replacesFile, textPatch } from './saved-replies.patch';

const OLD = 'saved/a1/old.pdf';

describe('saved reply patch pieces', () => {
  it('attachmentColumns: a stored file with its name, or every column null', () => {
    const file = { path: OLD, mime: 'application/pdf', size: 10 };
    expect(attachmentColumns(file, 'x.pdf')).toEqual({
      attachment_path: OLD,
      attachment_mime: 'application/pdf',
      attachment_size: 10,
      attachment_name: 'x.pdf',
    });
    expect(attachmentColumns(null, 'x.pdf')).toEqual({
      attachment_path: null,
      attachment_mime: null,
      attachment_size: null,
      attachment_name: null,
    });
  });

  it('textPatch keeps only the sent text fields', () => {
    expect(textPatch({})).toEqual({});
    expect(textPatch({ title: 't' })).toEqual({ title: 't' });
    expect(textPatch({ title: 't', body: 'b' })).toEqual({ title: 't', body: 'b' });
  });

  it('replacesFile: no attachment key keeps the file; null or a new path replaces it', () => {
    expect(replacesFile(undefined, OLD)).toBe(false);
    expect(replacesFile({ path: OLD, name: 'x' }, OLD)).toBe(false);
    expect(replacesFile({ path: 'saved/a1/new.pdf', name: 'x' }, OLD)).toBe(true);
    expect(replacesFile(null, OLD)).toBe(true);
  });
});
