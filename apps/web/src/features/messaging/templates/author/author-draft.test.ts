import { describe, expect, it } from 'vitest';
import { authorStatus } from './author-status';
import { categoryOf, emptyAuthorDraft, toAuthorInput } from './author-draft';

describe('a sales template draft', () => {
  it('follows the text for its category until the author picks one', () => {
    const draft = { ...emptyAuthorDraft(), body: 'خصم 20% على الباقة' };
    expect(categoryOf(draft)).toBe('marketing');
    expect(categoryOf({ ...draft, body: 'موعد حلقتك غدًا' })).toBe('utility');
    expect(categoryOf({ ...draft, category: 'utility' })).toBe('utility');
  });

  it('posts var_n samples and plain quick replies', () => {
    const draft = {
      ...emptyAuthorDraft(),
      body: 'أهلًا {{1}} نرحب بك',
      vars: [{ name: 'student_name', sample: 'سارة' }],
      buttons: [{ type: 'quick_reply' as const, text: 'نعم', intent: '' as const }],
    };
    expect(toAuthorInput(draft)).toEqual({
      key: '', category: 'utility', body: 'أهلًا {{1}} نرحب بك', footer: '',
      params: [{ name: 'var_1', sample: 'سارة' }], buttons: [{ type: 'quick_reply', text: 'نعم' }],
    });
  });

  it('reads Meta\'s status as the author needs it', () => {
    expect(['pending', 'approved', 'rejected', 'paused', 'not_submitted'].map((s) => authorStatus(s as never)))
      .toEqual(['pending', 'approved', 'rejected', 'other', 'other']);
  });
});
