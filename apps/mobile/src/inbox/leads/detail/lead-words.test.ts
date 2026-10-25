import { leadStatusStyle } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { leadSourceWord, leadStatusChip } from './lead-words';

test('a known status: its shape and ar.json word', () => {
  expect(leadStatusChip('no_reply')).toEqual({ ...leadStatusStyle.no_reply, label: t.enums.leadStatus.no_reply });
});

test('a status this build does not know yet shows raw and neutral', () => {
  expect(leadStatusChip('frozen')).toEqual({ tone: 'neutral', glyph: 'hollow', label: 'frozen' });
});

test('a source: its word, or the raw value', () => {
  expect(leadSourceWord('facebook_ad')).toBe(t.enums.leadSource.facebook_ad);
  expect(leadSourceWord('tiktok_ad')).toBe('tiktok_ad');
});
