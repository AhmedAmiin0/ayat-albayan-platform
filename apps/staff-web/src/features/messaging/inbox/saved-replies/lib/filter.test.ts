import type { SavedReply } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fillComposer, filterReplies, slashQuery } from './filter';

const reply = (over: Partial<SavedReply>): SavedReply => ({
  id: 'r', scope: 'shared', title: 'الأسعار', body: 'تجد قائمة الأسعار مرفقة', attachment: null, position: 0, updated_at: '', ...over,
});

describe('filterReplies', () => {
  const list = [reply({ id: '1' }), reply({ id: '2', title: 'ترحيب', body: 'أهلًا وسهلًا' }), reply({ id: '3', scope: 'mine', title: 'متابعة' })];
  it('keeps one tab, in served order, matching title or text', () => {
    expect(filterReplies(list, { scope: 'shared', query: '' }).map((r) => r.id)).toEqual(['1', '2']);
    expect(filterReplies(list, { scope: 'shared', query: 'اهلا' }).map((r) => r.id)).toEqual(['2']);
    expect(filterReplies(list, { scope: 'shared', query: 'قائمة' }).map((r) => r.id)).toEqual(['1']);
    expect(filterReplies(list, { scope: 'mine', query: '' }).map((r) => r.id)).toEqual(['3']);
  });
});

describe('slashQuery / fillComposer', () => {
  it('opens on «/» at the start or after a newline, never mid-sentence', () => {
    expect([slashQuery('/'), slashQuery('/سع'), slashQuery('سطر\n/تر')]).toEqual(['', 'سع', 'تر']);
    expect([slashQuery('نعم/لا'), slashQuery('أ /'), slashQuery('/a\nb'), slashQuery('')]).toEqual([null, null, null, null]);
  });

  it('replaces the token, fills an empty box, or adds a line', () => {
    expect(fillComposer('/سع', 'نص')).toBe('نص');
    expect(fillComposer('مرحبًا\n/سع', 'نص')).toBe('مرحبًا\nنص');
    expect(fillComposer('  ', 'نص')).toBe('نص');
    expect(fillComposer('مرحبًا ', 'نص')).toBe('مرحبًا\nنص');
  });
});
