import type { SavedReply } from '@ab/shared';
import { filledText, filterReplies, slashAt } from './reply-text';

const reply = (over: Partial<SavedReply>): SavedReply => ({
  id: 'r', scope: 'shared', title: 'ع', body: 'ب', attachment: null, position: 0, updated_at: '2026-10-25T00:00:00Z', ...over,
});
const LIST = [
  reply({ id: '1', title: 'الأسعار', body: 'تجد الأسعار مرفقة' }),
  reply({ id: '2', title: 'ترحيب', body: 'أهلًا {name}، كيف نخدمك؟' }),
  reply({ id: '3', scope: 'mine', title: 'متابعة', body: 'هل اطلعت على الأسعار؟' }),
];

test('filterReplies keeps one tab and searches title and body, ignoring letter variants', () => {
  expect(filterReplies(LIST, { scope: 'shared', query: '' }).map((r) => r.id)).toEqual(['1', '2']);
  expect(filterReplies(LIST, { scope: 'shared', query: 'نخدمك' }).map((r) => r.id)).toEqual(['2']);
  expect(filterReplies(LIST, { scope: 'shared', query: 'اهلا' }).map((r) => r.id)).toEqual(['2']);
  expect(filterReplies(LIST, { scope: 'mine', query: 'الاسعار' }).map((r) => r.id)).toEqual(['3']);
});

test('slashAt: «/» at the start of the box or of a line only', () => {
  expect(slashAt('', '/')).toBe(0);
  expect(slashAt('سطر\n', 'سطر\n/')).toBe(4);
  expect(slashAt('أهلًا', 'أهلًا/')).toBeNull();
  expect(slashAt('', '/abc')).toBeNull();
});

test('filledText replaces the «/», else appends on a new line', () => {
  expect(filledText({ text: '/', reply: 'أهلًا', slash: 0 })).toBe('أهلًا');
  expect(filledText({ text: 'سطر\n/', reply: 'أهلًا', slash: 4 })).toBe('سطر\nأهلًا');
  expect(filledText({ text: '', reply: 'أهلًا', slash: null })).toBe('أهلًا');
  expect(filledText({ text: 'شكرًا  ', reply: 'أهلًا', slash: null })).toBe('شكرًا\nأهلًا');
  expect(filledText({ text: 'بدون شرطة', reply: 'أهلًا', slash: 3 })).toBe('بدون شرطة\nأهلًا');
});
