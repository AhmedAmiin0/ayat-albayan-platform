import { describe, expect, it } from 'vitest';
import { tappedButton } from './button-reply.js';

describe('tappedButton', () => {
  it('a template quick reply: its text', () => {
    expect(tappedButton({ type: 'button', button: { text: 'تأكيد', payload: 'confirm:1' } })).toBe('تأكيد');
  });

  it('a reply button and a list row: their title', () => {
    expect(tappedButton({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'a', title: 'نعم' } } })).toBe('نعم');
    expect(tappedButton({ type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'b', title: 'الأحد' } } })).toBe('الأحد');
  });

  it('anything else, or a blank label: null', () => {
    expect(tappedButton(null)).toBeNull();
    expect(tappedButton('button')).toBeNull();
    expect(tappedButton({ type: 'image', image: {} })).toBeNull();
    expect(tappedButton({ type: 'reaction', reaction: { emoji: '👍' } })).toBeNull();
    expect(tappedButton({ type: 'button', button: { text: '  ' } })).toBeNull();
    expect(tappedButton({ type: 'interactive', interactive: { type: 'nfm_reply', nfm_reply: { title: 'x' } } })).toBeNull();
    expect(tappedButton({ type: 'interactive', interactive: null })).toBeNull();
  });
});
