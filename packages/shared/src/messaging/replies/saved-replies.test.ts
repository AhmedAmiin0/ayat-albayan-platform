import { describe, expect, it } from 'vitest';
import {
  isSavedReplyError,
  SAVED_REPLY_TITLE_MAX,
  savedReplyCreateSchema,
  savedReplyMoveSchema,
  savedReplyStageSchema,
  savedReplyUpdateSchema,
  savedReplyUploadSchema,
} from './saved-replies.js';

describe('savedReplyCreateSchema', () => {
  it('trims title and body and takes an optional attachment', () => {
    const made = savedReplyCreateSchema.parse({ scope: 'mine', title: ' الأسعار ', body: ' السعر مرفق \n' });
    expect(made).toEqual({ scope: 'mine', title: 'الأسعار', body: 'السعر مرفق' });
    const withFile = { scope: 'shared', title: 'ق', body: 'ب', attachment: { path: 'saved/u/x.pdf', name: 'الأسعار.pdf' } };
    expect(savedReplyCreateSchema.parse(withFile).attachment?.name).toBe('الأسعار.pdf');
  });

  it('refuses a blank or long title, a blank body, an unknown scope and a slash in the file name', () => {
    const bad = [
      { scope: 'mine', title: ' ', body: 'ب' },
      { scope: 'mine', title: 'ع'.repeat(SAVED_REPLY_TITLE_MAX + 1), body: 'ب' },
      { scope: 'mine', title: 'ع', body: '  ' },
      { scope: 'everyone', title: 'ع', body: 'ب' },
      { scope: 'mine', title: 'ع', body: 'ب', attachment: { path: 'p', name: 'a/b.pdf' } },
      { scope: 'mine', title: 'ع', body: 'ب'.repeat(4097) },
    ];
    expect(bad.map((b) => savedReplyCreateSchema.safeParse(b).success)).toEqual(bad.map(() => false));
  });
});

describe('the other bodies', () => {
  it('PATCH keeps missing keys missing and takes attachment null (remove)', () => {
    expect(savedReplyUpdateSchema.parse({ title: ' ج ' })).toEqual({ title: 'ج' });
    expect(savedReplyUpdateSchema.parse({ attachment: null })).toEqual({ attachment: null });
  });

  it('move is up or down; upload is a chat type; stage needs a uuid', () => {
    expect(savedReplyMoveSchema.safeParse({ direction: 'up' }).success).toBe(true);
    expect(savedReplyMoveSchema.safeParse({ direction: 'left' }).success).toBe(false);
    expect(savedReplyUploadSchema.safeParse({ mime: 'application/pdf', size: 10 }).success).toBe(true);
    expect(savedReplyUploadSchema.safeParse({ mime: 'image/webp', size: 10 }).success).toBe(false);
    expect(savedReplyStageSchema.safeParse({ clientRequestId: 'nope' }).success).toBe(false);
  });

  it('knows its error codes', () => {
    expect([isSavedReplyError('saved_reply_not_found'), isSavedReplyError('other')]).toEqual([true, false]);
  });
});
