import { describe, expect, it } from 'vitest';
import { sentExtras } from './sender.due';

// What a send adds to the sent row (2026-11-14: a refused voice note's m4a is recorded).

describe('sentExtras', () => {
  it('nothing for a plain send', () => {
    expect(sentExtras({ waMessageId: 'w' })).toEqual({});
  });

  it('Evolution’s template as text, and the m4a that went instead of the ogg', () => {
    expect(sentExtras({ waMessageId: 'w', asText: true })).toEqual({ sent_as_text: true });
    const media = { media_path: 'out/a/r/voice.m4a', media_mime: 'audio/mp4', media_name: 'voice.m4a' };
    expect(sentExtras({ waMessageId: 'w', media })).toEqual(media);
  });
});
