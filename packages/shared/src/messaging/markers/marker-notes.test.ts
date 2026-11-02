import { describe, expect, it } from 'vitest';
import { messageNote, noteText, previewNote } from './marker-notes.js';

const WORDS = {
  deleted: 'تم حذف هذه الرسالة',
  adWelcome: 'رسالة الترحيب من الإعلان',
  unsupported: 'رسالة غير مدعومة',
};
const out = (interactive_payload: unknown, deleted?: boolean) => ({
  direction: 'outbound' as const,
  interactive_payload,
  ...(deleted === undefined ? {} : { deleted }),
});

describe('messageNote', () => {
  it('a deleted message is deleted whatever it held', () => {
    expect(messageNote(out({ type: 'image' }, true))).toBe('deleted');
    expect(messageNote({ direction: 'inbound', interactive_payload: null, deleted: true })).toBe(
      'deleted',
    );
  });

  it("Kapso's errors echo is the ad's welcome; an outbound unsupported is unsupported", () => {
    expect(messageNote(out({ type: 'errors', errors: [] }))).toBe('ad_welcome');
    expect(messageNote(out({ type: 'unsupported' }))).toBe('unsupported');
  });

  it("an inbound unsupported is not a note (Meta's «content never arrived» has its own wording)", () => {
    expect(
      messageNote({ direction: 'inbound', interactive_payload: { type: 'unsupported' } }),
    ).toBeNull();
  });

  it('an ordinary row has none', () => {
    for (const p of [null, { type: 'image' }, { type: 'location' }])
      expect(messageNote(out(p))).toBeNull();
  });
});

describe('noteText', () => {
  it("shows the ad's own welcome when stored, else the label", () => {
    expect(noteText(out({ type: 'errors', welcome: 'مرحبًا بك' }), WORDS)).toBe('مرحبًا بك');
    expect(noteText(out({ type: 'errors', welcome: null }), WORDS)).toBe(WORDS.adWelcome);
  });

  it('words a deleted and an unsupported row; null for an ordinary one', () => {
    expect(noteText(out(null, true), WORDS)).toBe(WORDS.deleted);
    expect(noteText(out({ type: 'unsupported' }), WORDS)).toBe(WORDS.unsupported);
    expect(noteText(out(null), WORDS)).toBeNull();
  });
});

describe('previewNote', () => {
  it('is null without a note, the words otherwise', () => {
    expect(previewNote({ last_body: 'hi' }, WORDS)).toBeNull();
    expect(previewNote({ last_note: null, last_body: 'hi' }, WORDS)).toBeNull();
    expect(previewNote({ last_note: 'deleted', last_body: null }, WORDS)).toBe(WORDS.deleted);
    expect(previewNote({ last_note: 'ad_welcome', last_body: 'أهلًا' }, WORDS)).toBe('أهلًا');
    expect(previewNote({ last_note: 'ad_welcome', last_body: null }, WORDS)).toBe(WORDS.adWelcome);
  });
});
