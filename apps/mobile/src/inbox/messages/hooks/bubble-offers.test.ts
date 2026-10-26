import { message } from '../../shared/thread-fixtures';
import { bubbleOffers, downloadLabel, offersAny } from './bubble-offers';
import { t } from '@/core/lib/i18n/i18n';

const photo = message({ id: 'f1', body: null, media_mime: 'image/jpeg', replyable: true, forwardable: true });
const on = { enabled: true, teacher: false };

test('«نسخ النص» only for a message with text', () => {
  expect(bubbleOffers(message({ id: 'm1', body: 'نص' }), on).copy).toBe(true);
  expect(bubbleOffers(message({ id: 'm2', body: '   ' }), on).copy).toBe(false);
  expect(bubbleOffers(photo, on).copy).toBe(false);
});

test('«تنزيل» only for a file this viewer may open (never a teacher, never an imported link)', () => {
  expect(bubbleOffers(photo, on).download).toBe(true);
  expect(bubbleOffers(photo, { enabled: true, teacher: true }).download).toBe(false);
  expect(bubbleOffers({ ...photo, media_url: 'https://old.example/x.jpg' }, on).download).toBe(false);
  expect(bubbleOffers({ ...photo, media_mime: 'application/zip' }, on).download).toBe(false);
});

test('outside a chat screen (no provider): nothing', () => {
  expect(offersAny(bubbleOffers(photo, { enabled: false, teacher: false }))).toBe(false);
});

test('the download label names the file, else its kind', () => {
  expect(downloadLabel({ media_name: 'a.pdf', media_mime: 'application/pdf' })).toBe(t.inbox.download.label.replace('{name}', 'a.pdf'));
  expect(downloadLabel({ media_name: null, media_mime: 'image/jpeg' })).toBe(t.inbox.download.label.replace('{name}', t.inbox.media.image));
});
