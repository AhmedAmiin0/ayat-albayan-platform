import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { thread } from './inbox-fixture';
import { replyFromText } from './reply-from';

const text = (line: 'chat' | 'notifications') => t.inbox.line.replyFrom.replace('{line}', t.enums.waLine[line]);

describe('replyFromText (docs/12 §13.10)', () => {
  it('names the chat line inside an open window', () => {
    expect(replyFromText(thread({ session_open: true, last_inbound_line: 'chat' }))).toBe(text('chat'));
  });

  it('names the notifications line inside an open window', () => {
    const out = replyFromText(thread({ session_open: true, last_inbound_line: 'notifications' }));
    expect(out).toBe(text('notifications'));
    expect(out).not.toContain('{line}');
  });

  it('null for a closed window, whatever the line', () => {
    expect(replyFromText(thread({ session_open: false, last_inbound_line: 'chat' }))).toBeNull();
  });

  it('null when the line is unknown (null or absent)', () => {
    expect(replyFromText(thread({ session_open: true, last_inbound_line: null }))).toBeNull();
    expect(replyFromText(thread({ session_open: true }))).toBeNull();
  });
});
