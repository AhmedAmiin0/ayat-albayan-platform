import { describe, expect, it } from 'vitest';
import { defaultMediaMime, echoPayload } from './echo-payload.js';

const W = 'wamid.ORIGINAL';

describe('echoPayload', () => {
  it('is null for a text or a template (the row carries them itself)', () => {
    expect(echoPayload({ type: 'text', text: { body: 'hi' } })).toBeNull();
    expect(echoPayload({ type: 'template', template: { name: 'x' } })).toBeNull();
    expect(echoPayload(null)).toBeNull();
    expect(echoPayload({})).toBeNull();
  });

  it('turns an edit, a revoke and a reaction into marker payloads', () => {
    const edit = {
      type: 'edit',
      edit: { original_message_id: W, message: { text: { body: 'b' } } },
    };
    expect(echoPayload(edit)).toEqual({ type: 'edit', marker: true, target: W, text: 'b' });
    const revoke = { type: 'revoke', revoke: { original_message_id: W } };
    expect(echoPayload(revoke)).toEqual({ type: 'revoke', marker: true, target: W });
    const reaction = { type: 'reaction', reaction: { message_id: W, emoji: '🙏' } };
    expect(echoPayload(reaction)).toMatchObject({ type: 'reaction', marker: true, target: W });
  });

  it("keeps Kapso's errors item with the ad's welcome text, or none", () => {
    const errors = [{ code: 131051, title: 'Message type unknown' }];
    expect(echoPayload({ type: 'errors', errors })).toEqual({
      type: 'errors',
      errors,
      welcome: null,
    });
    const withText = { type: 'errors', referral: { welcome_message: { text: 'أهلًا' } } };
    expect(echoPayload(withText)).toMatchObject({ type: 'errors', welcome: 'أهلًا' });
  });

  it('keeps a media or unsupported part as Meta sent it, never a placeholder', () => {
    const image = { type: 'image', image: { id: 'm1', mime_type: 'image/jpeg' } };
    expect(echoPayload(image)).toEqual({ type: 'image', image: image.image });
    const errors = [{ code: 131051 }];
    expect(echoPayload({ type: 'unsupported', errors })).toEqual({
      type: 'unsupported',
      unsupported: null,
      errors,
    });
  });
});

describe('defaultMediaMime', () => {
  it("is WhatsApp's own format per media type, null for anything else", () => {
    expect(defaultMediaMime('image')).toBe('image/jpeg');
    expect(defaultMediaMime('audio')).toBe('audio/ogg');
    expect(defaultMediaMime('document')).toBe('application/octet-stream');
    expect(defaultMediaMime('location')).toBeNull();
  });
});
