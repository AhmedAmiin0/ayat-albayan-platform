import type { MessageQuote } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { quoteOf, quoteSender, quoteText } from './quote-text';
import { inbound, message } from '../../shared/thread-fixtures';

const q = (fields: Partial<MessageQuote>): MessageQuote => ({
  id: 'm1',
  direction: 'inbound',
  body: null,
  media_mime: null,
  template_key: null,
  sender_name: null,
  ...fields,
});

describe('quoteSender', () => {
  it('theirs: the chat name', () => {
    expect(quoteSender(q({}), 'هدى سالم')).toBe('هدى سالم');
    expect(quoteSender(q({}), null)).toBe('');
  });
  it('ours: who sent it, else «أنت»', () => {
    expect(quoteSender(q({ direction: 'outbound', sender_name: 'سارة' }), 'هدى')).toBe('سارة');
    expect(quoteSender(q({ direction: 'outbound' }), 'هدى')).toBe(t.inbox.reply.you);
  });
});

describe('quoteText', () => {
  it('the first line of the text, trimmed', () => {
    expect(quoteText(q({ body: '  السلام عليكم  \nسطر ثانٍ' }))).toBe('السلام عليكم');
  });
  it('a file without a caption says its kind (a PDF apart); with one, the caption (owner 2026-10-31)', () => {
    expect(quoteText(q({ media_mime: 'image/jpeg' }))).toBe(t.inbox.media.image);
    expect(quoteText(q({ media_mime: 'application/pdf' }))).toBe(t.inbox.media.pdf);
    expect(quoteText(q({ media_mime: 'application/pdf', body: 'الفاتورة' }))).toBe('الفاتورة');
    expect(quoteText(q({ media_mime: 'audio/ogg; codecs=opus' }))).toBe(t.inbox.media.audio);
  });
  it('a template says so; nothing at all says it is not supported', () => {
    expect(quoteText(q({ template_key: 'lesson_reminder_plain' }))).toBe(t.inbox.reply.template);
    expect(quoteText(q({}))).toBe(t.inbox.media.other);
  });
});

describe('quoteOf', () => {
  it('a loaded message as the API quotes it: text cut to 200, ours keep the sender', () => {
    const long = message({ id: 'm7', body: 'ا'.repeat(300), sender_name: 'سارة' });
    expect(quoteOf(long)).toMatchObject({ id: 'm7', direction: 'outbound', sender_name: 'سارة' });
    expect(quoteOf(long).body).toHaveLength(200);
  });
  it('theirs carry no sender; a template carries no body', () => {
    expect(quoteOf(inbound)).toMatchObject({ direction: 'inbound', sender_name: null, body: inbound.body });
    const tpl = message({ id: 'm8', body: 'حلقة اليوم', template_key: 'lesson_reminder_plain' });
    expect(quoteOf(tpl).body).toBeNull();
  });
});
