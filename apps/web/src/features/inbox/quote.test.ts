import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message, PHONE } from './testing/inbox-fixture';
import { quoteOf, quoteSender, quoteText } from './quote';

const chat = { name: 'أم سهيلة', phone: PHONE };

describe('quote: what a reply shows', () => {
  it('quoteOf keeps the fields the API sends and cuts the body to 200', () => {
    const q = quoteOf(message({ id: 'x', body: 'ا'.repeat(250), sender_name: 'سارة' }));
    expect(q).toMatchObject({ id: 'x', direction: 'inbound', media_mime: null, template_key: null, sender_name: 'سارة' });
    expect(q.body).toHaveLength(200);
  });

  it('theirs: the chat name, else the number; ours: the sender, else «أنت»', () => {
    const theirs = quoteOf(message());
    expect(quoteSender(theirs, chat)).toBe('أم سهيلة');
    expect(quoteSender(theirs, { name: null, phone: PHONE })).toContain('966');
    const ours = quoteOf(message({ direction: 'outbound', sender_name: 'سارة' }));
    expect(quoteSender(ours, chat)).toBe('سارة');
    expect(quoteSender({ ...ours, sender_name: null }, chat)).toBe(t.inbox.reply.you);
  });

  it('the first line, else the file kind, else the template label', () => {
    expect(quoteText(quoteOf(message({ body: ' السطر الأول \nالثاني' })))).toBe('السطر الأول');
    expect(quoteText(quoteOf(message({ body: null, media_mime: 'image/jpeg' })))).toBe(t.inbox.media.image);
    expect(quoteText(quoteOf(message({ body: null, media_mime: 'application/pdf' })))).toBe(t.inbox.media.document);
    expect(quoteText(quoteOf(message({ body: null, template_key: 'renewal_due' })))).toBe(t.inbox.reply.template);
    expect(quoteText(quoteOf(message({ body: null })))).toBe(t.inbox.media.other);
  });
});
