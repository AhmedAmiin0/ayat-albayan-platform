import type { SavedReply } from '@ab/shared';
import { matchReplies, slashSearch } from './reply-text';

const reply = (over: Partial<SavedReply>): SavedReply => ({
  id: 'r', scope: 'shared', title: 'ع', body: 'ب', attachment: null, position: 0, updated_at: '2026-10-25T00:00:00Z', ...over,
});

test('slashSearch: the text after the open «/», gone with the «/» or on a new line', () => {
  expect(slashSearch('/', 0)).toBe('');
  expect(slashSearch('/سع', 0)).toBe('سع');
  expect(slashSearch('سطر\n/تر', 4)).toBe('تر');
  expect(slashSearch('سع', 0)).toBeNull();
  expect(slashSearch('', 0)).toBeNull();
  expect(slashSearch('/سع\n', 0)).toBeNull();
  expect(slashSearch('/سع', null)).toBeNull();
});

test('matchReplies: shared then mine in one list, title and text searched, Arabic letter forms ignored', () => {
  const list = [
    reply({ id: 'm', scope: 'mine', title: 'متابعة', body: 'هل اطلعت على الأسعار؟' }),
    reply({ id: 's', title: 'الأسعار', body: 'مرفقة' }),
    reply({ id: 'w', title: 'ترحيب', body: 'أهلًا' }),
  ];
  expect(matchReplies(list, '').map((r) => r.id)).toEqual(['s', 'w', 'm']);
  expect(matchReplies(list, 'الاسعار').map((r) => r.id)).toEqual(['s', 'm']);
  expect(matchReplies(list, 'اهلا').map((r) => r.id)).toEqual(['w']);
});
