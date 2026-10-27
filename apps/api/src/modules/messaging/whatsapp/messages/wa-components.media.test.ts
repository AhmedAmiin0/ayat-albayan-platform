import { describe, expect, it } from 'vitest';
import { mediaMessage } from './wa-components';

const TO = '+966551234567';

describe('mediaMessage — a file sent from the chat (owner 2026-10-19 #2)', () => {
  it('an image: type image, link and caption, never a filename', () => {
    expect(mediaMessage({ to: TO, kind: 'image', url: 'https://s/a.jpg', filename: 'a.jpg', caption: 'الواجب' })).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '966551234567',
      type: 'image',
      image: { link: 'https://s/a.jpg', caption: 'الواجب' },
    });
  });

  it('a document: its filename, no caption key when there is none', () => {
    const body = mediaMessage({ to: TO, kind: 'document', url: 'https://s/b.pdf', filename: 'خطة.pdf', caption: null });
    expect(body).toMatchObject({ type: 'document', document: { link: 'https://s/b.pdf', filename: 'خطة.pdf' } });
    expect(body['document']).not.toHaveProperty('caption');
    expect(body).not.toHaveProperty('image');
  });

  it('an ogg voice note: voice:true inside audio, no caption (owner 2026-10-27)', () => {
    const body = mediaMessage({ to: TO, kind: 'audio', url: 'https://s/voice.ogg', caption: 'x', voice: true });
    expect(body).toMatchObject({ type: 'audio', audio: { link: 'https://s/voice.ogg', voice: true } });
    expect(body['audio']).not.toHaveProperty('caption');
  });

  it('voice only for audio: plain audio has none, an image or document never carries it', () => {
    expect(mediaMessage({ to: TO, kind: 'audio', url: 'https://s/a.m4a' })['audio']).not.toHaveProperty('voice');
    expect(mediaMessage({ to: TO, kind: 'image', url: 'https://s/a.jpg', voice: true })['image']).not.toHaveProperty('voice');
    expect(mediaMessage({ to: TO, kind: 'document', url: 'https://s/a.pdf', voice: true })['document']).not.toHaveProperty('voice');
  });
});
