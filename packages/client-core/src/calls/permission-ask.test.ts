import { describe, expect, it } from 'vitest';
import { askOf, permissionHint, permissionReplyText, type PermissionWords } from './permission-ask.js';

const words: PermissionWords = {
  requestHint: 'request', needsTemplate: 'needs', limited: 'limited', viaTemplate: 'via-template', noTemplate: 'no-template',
  replyRejected: 'rejected {{at}}', replyAccepted: 'accepted {{at}}',
};

describe('the permission sheet (docs/28 §3.1, §10)', () => {
  it('granted starts the call (no sheet); otherwise the sheet keeps via and the reply', () => {
    expect(askOf('+1', { state: 'granted', expires_at: null })).toBeNull();
    expect(askOf('+1', { state: 'request', expires_at: null })).toEqual({ phone: '+1', state: 'request' });
    const reply = { response: 'rejected' as const, at: '2026-10-27T09:00:00Z', expires_at: null };
    expect(askOf('+1', { state: 'request', via: 'template', expires_at: null, reply })).toEqual({ phone: '+1', state: 'request', via: 'template', reply });
  });

  it('the hint: the chat line as before; a calls number\'s template or its empty setting', () => {
    expect(permissionHint({ state: 'request' }, words)).toBe('request');
    expect(permissionHint({ state: 'request', via: 'interactive' }, words)).toBe('request');
    expect(permissionHint({ state: 'request', via: 'template' }, words)).toBe('via-template');
    expect(permissionHint({ state: 'needs_template' }, words)).toBe('needs');
    expect(permissionHint({ state: 'needs_template', via: 'template' }, words)).toBe('no-template');
    expect(permissionHint({ state: 'limited' }, words)).toBe('limited');
  });

  it('the family\'s last answer in words, none = null', () => {
    const at = (iso: string) => iso.slice(0, 10);
    expect(permissionReplyText({ response: 'rejected', at: '2026-10-27T09:00:00Z', expires_at: null }, { text: words, at })).toBe('rejected 2026-10-27');
    expect(permissionReplyText({ response: 'accepted', at: '2026-10-26T09:00:00Z', expires_at: null }, { text: words, at })).toBe('accepted 2026-10-26');
    expect(permissionReplyText(null, { text: words, at })).toBeNull();
  });
});
