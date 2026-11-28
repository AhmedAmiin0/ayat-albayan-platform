import { describe, expect, it } from 'vitest';
import { mediaMessage, textMessage } from '@/modules/messaging/whatsapp/messages/wa-components';

const TO = '+966551234567';
const URL_ = 'https://s/a';

describe('mediaMessage — optional fields by kind', () => {
  it('a document keeps its filename and caption; other kinds drop the filename', () => {
    const doc = mediaMessage({ to: TO, kind: 'document', url: URL_, filename: 'f.pdf', caption: 'c' });
    expect(doc.document).toEqual({ link: URL_, caption: 'c', filename: 'f.pdf' });
    expect(mediaMessage({ to: TO, kind: 'video', url: URL_, filename: 'v.mp4' }).video).toEqual({
      link: URL_,
    });
  });

  it('no kind is a document', () => {
    expect(mediaMessage({ to: TO, url: URL_, filename: 'f.pdf' })).toMatchObject({
      type: 'document',
      document: { link: URL_, filename: 'f.pdf' },
    });
  });

  it('a reply carries the quoted wamid as context; none without one', () => {
    expect(mediaMessage({ to: TO, kind: 'image', url: URL_, replyTo: 'wamid.1' }).context).toEqual({
      message_id: 'wamid.1',
    });
    expect(mediaMessage({ to: TO, kind: 'image', url: URL_, replyTo: null })).not.toHaveProperty(
      'context',
    );
    expect(textMessage({ to: TO, text: 'x', replyTo: 'wamid.2' }).context).toEqual({
      message_id: 'wamid.2',
    });
    expect(textMessage({ to: TO, text: 'x' })).not.toHaveProperty('context');
  });
});
