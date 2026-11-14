import { describe, expect, it } from 'vitest';
import { authorMayEdit, authorsTemplates, suggestedCategory, type AuthorEditable } from './author-rules.js';

const ME = 'u-sales-1';
const starter: AuthorEditable = {
  key: 'summer_offer', sales_starter: true, line: 'chat', header_format: null, status: 'approved',
  created_by: ME,
};

describe('templates.author', () => {
  it('is the permission, whatever the base role', () => {
    expect(authorsTemplates({ role: 'sales', permissions: ['templates.author'] })).toBe(true);
    expect(authorsTemplates({ role: 'teacher', permissions: ['templates.author'] })).toBe(true);
    expect(authorsTemplates({ role: 'teacher', permissions: ['messages.read'] })).toBe(false);
    expect(authorsTemplates(null)).toBe(false);
  });

  it('edits their own allow-list template of the chat line that the code does not send', () => {
    expect(authorMayEdit(starter, ME)).toBe(true);
    expect(authorMayEdit({ ...starter, status: 'rejected' }, ME)).toBe(true);
  });

  it("never edits another author's template, a seeded one, or with no signed-in user", () => {
    expect(authorMayEdit({ ...starter, created_by: 'u-sales-2' }, ME)).toBe(false);
    expect(authorMayEdit({ ...starter, created_by: null }, ME)).toBe(false);
    expect(authorMayEdit({ ...starter, created_by: undefined }, undefined)).toBe(false);
    expect(authorMayEdit(starter, undefined)).toBe(false);
    expect(authorMayEdit({ ...starter, created_by: '' }, '')).toBe(false);
  });

  it('never edits off the allow-list, another line, code-bound, PDF, own-button or pending ones', () => {
    const refused: AuthorEditable[] = [
      { ...starter, sales_starter: false },
      { ...starter, line: 'notifications' },
      { ...starter, key: 'lesson_reminder' },
      { ...starter, header_format: 'document' },
      { ...starter, key: 'lesson_join_link' },
      { ...starter, status: 'pending' },
      { ...starter, status: 'disabled' },
    ];
    for (const t of refused) expect([t, authorMayEdit(t, ME)]).toEqual([t, false]);
  });

  it('picks MARKETING for an offer, UTILITY otherwise', () => {
    expect(suggestedCategory('خصم 20% على باقة الشهر')).toBe('marketing');
    expect(suggestedCategory('عرض خاص للأسرة {{1}}')).toBe('marketing');
    expect(suggestedCategory('موعد حلقتك القادمة يوم {{1}}')).toBe('utility');
  });
});
