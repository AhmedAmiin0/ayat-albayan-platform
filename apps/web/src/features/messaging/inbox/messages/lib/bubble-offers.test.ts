import { describe, expect, it } from 'vitest';
import { message } from '../../testing/inbox-fixture';
import { bubbleOffers, offersAny } from './bubble-offers';

const text = message({ id: 'm1', body: 'السلام عليكم', replyable: true, forwardable: true });
const photo = message({ id: 'm2', body: null, media_mime: 'image/jpeg', replyable: true, forwardable: true });

describe('bubbleOffers: «نسخ» for text, «تنزيل» for a file this viewer may open', () => {
  it('a text message: copy, no download', () => {
    expect(bubbleOffers(text, { teacher: false })).toMatchObject({ copy: true, download: false });
  });

  it('a photo without a caption: download, no copy', () => {
    expect(bubbleOffers(photo, { teacher: false })).toMatchObject({ copy: false, download: true });
  });

  it('teacher mode never downloads (the API answers 403 media_forbidden)', () => {
    expect(bubbleOffers(photo, { teacher: true }).download).toBe(false);
  });

  it('an imported link (media_url), a type no bubble opens, or blank text: nothing to copy or save', () => {
    const o = bubbleOffers(message({ id: 'm3', body: '  ', media_mime: 'application/zip', replyable: false, forwardable: false }), {
      teacher: false,
    });
    expect(offersAny(o)).toBe(false);
    expect(bubbleOffers({ ...photo, media_url: 'https://old.example/x.jpg' }, { teacher: false }).download).toBe(false);
  });
});
