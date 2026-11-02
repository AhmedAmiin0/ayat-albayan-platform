import { t } from '@/core/lib/i18n/i18n';
import { muscat, pending } from '../testing/fixtures';
import { heroLead, heroSubtitle } from './hero-text';

test('the lead: minutes to go under an hour, just «التالية» later, «جارية الآن» when under way', () => {
  expect(heroLead({ kind: 'next', lesson: pending, minutes: 12 })).toBe('الحلقة التالية · بعد 12 دقيقة');
  expect(heroLead({ kind: 'next', lesson: pending, minutes: 1 })).toBe('الحلقة التالية · بعد دقيقة');
  expect(heroLead({ kind: 'next', lesson: pending, minutes: 5 })).toBe('الحلقة التالية · بعد 5 دقائق');
  expect(heroLead({ kind: 'next', lesson: pending, minutes: 60 })).toBe(t.today.next);
  expect(heroLead({ kind: 'running', lesson: pending })).toBe(t.today.running);
});

test('the line under the names: the titled teacher, the length, the student’s own clock', () => {
  expect(heroSubtitle(pending, '24', 'Asia/Riyadh')).toBe(`مع أ. أبرار · ${t.enums.duration['45']}`);
  expect(heroSubtitle(muscat, '24', 'Asia/Riyadh')).toBe(`مع أ. أبرار · ${t.enums.duration['60']} · 18:00 بتوقيت مسقط`);
});
