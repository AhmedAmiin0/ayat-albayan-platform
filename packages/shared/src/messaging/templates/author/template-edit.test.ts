import { describe, expect, it } from 'vitest';
import { templateAuthorSchema, templateEditSchema } from './template-edit.js';

describe('templateEditSchema', () => {
  it('takes new words, samples and buttons; never a name or a category', () => {
    const out = templateEditSchema.parse({
      body: ' مرحبًا {{1}}، أهلًا بك ', footer: '', name: 'x', category: 'marketing',
      params: [{ name: 'contact_name', sample: 'أحمد' }],
      buttons: [{ type: 'quick_reply', text: 'نعم' }, { type: 'quick_reply', text: 'تأكيد', intent: 'confirm' }],
    });
    expect(out).toEqual({
      body: 'مرحبًا {{1}}، أهلًا بك', footer: null,
      params: [{ name: 'contact_name', sample: 'أحمد' }],
      buttons: [{ type: 'quick_reply', text: 'نعم' }, { type: 'quick_reply', text: 'تأكيد', intent: 'confirm' }],
    });
  });

  it('refuses four buttons and a footer with a variable', () => {
    const b = { type: 'quick_reply', text: 'نعم' };
    expect(templateEditSchema.safeParse({ body: 'نص', buttons: [b, b, b, b] }).success).toBe(false);
    expect(templateEditSchema.safeParse({ body: 'نص', footer: '{{1}}' }).success).toBe(false);
  });
});

describe('templateAuthorSchema', () => {
  it('a blank name is the API\'s to choose; quick replies only', () => {
    const out = templateAuthorSchema.parse({ key: ' ', category: 'utility', body: 'مرحبًا بك' });
    expect(out.key).toBeNull();
    expect(out.buttons).toEqual([]);
    const url = { type: 'url', text: 'افتح', url: 'https://example.org' };
    expect(templateAuthorSchema.safeParse({ category: 'utility', body: 'نص', buttons: [url] }).success).toBe(false);
  });

  it('only utility or marketing, and a Meta-shaped name', () => {
    expect(templateAuthorSchema.safeParse({ category: 'authentication', body: 'نص' }).success).toBe(false);
    expect(templateAuthorSchema.safeParse({ key: 'Summer Offer', category: 'utility', body: 'نص' }).success).toBe(false);
    expect(templateAuthorSchema.parse({ key: 'summer_offer', category: 'marketing', body: 'نص' }).key).toBe('summer_offer');
  });
});
