import { ApiError } from '@/core/lib/http/api';
import { mediaProblem, photoBox } from './media-problem';

test('410 expired, 403 forbidden, 409 crm_no_media the CRM, anything else failed', () => {
  expect(mediaProblem(new ApiError(410, { code: 'media_expired' }))).toBe('expired');
  expect(mediaProblem(new ApiError(403, { code: 'media_forbidden' }))).toBe('forbidden');
  expect(mediaProblem(new ApiError(409, { code: 'crm_no_media' }))).toBe('crm');
  expect(mediaProblem(new ApiError(409, { code: 'other' }))).toBe('failed');
  expect(mediaProblem(new ApiError(500))).toBe('failed');
  expect(mediaProblem(new Error('offline'))).toBe('failed');
});

test('a served photo previews in the 220 box, a sticker in the small uncut one', () => {
  expect(photoBox('image/jpeg')).toEqual({ size: 220, resizeMode: 'cover', border: true });
  expect(photoBox('image/png')).toEqual({ size: 220, resizeMode: 'cover', border: true });
  expect(photoBox('image/webp')).toEqual({ size: 120, resizeMode: 'contain', border: false });
});

test('HEIC, PDFs, voice notes, videos and unserved images are not previewed', () => {
  for (const mime of ['image/heic', 'application/pdf', 'audio/ogg; codecs=opus', 'video/mp4', 'image/gif', null]) {
    expect(photoBox(mime)).toBeNull();
  }
});
