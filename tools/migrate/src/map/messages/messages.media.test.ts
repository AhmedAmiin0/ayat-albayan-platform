// mapMessages: an inbound file keeps its CRM link as the body (the receipt bug, owner 2026-10-29);
// every other row gets no media_name key, so its payload hash stays the same.
import { describe, expect, it } from 'vitest';
import { SA, bundle, contact, crm, message } from '../leads/fixtures.ts';
import { mapMessages } from './messages.ts';

const URL_PDF = 'https://crm.example/storage/v1/object/public/chat-media/a/receipt.pdf';
const URL_JPG = 'https://crm.example/storage/v1/object/public/chat-media/a/photo.jpg';
const at = '2026-09-12T09:00:00+00:00';
const out = mapMessages(
  bundle({
    crm: crm({
      contacts: [contact('k1', SA)],
      messages: [
        message({
          id: 'pdf',
          conv: 'c-k1',
          sender: 'customer',
          at,
          type: 'document',
          text: 'Transaction-Receipt.pdf',
          media: { url: URL_PDF, mime: 'application/pdf' },
        }),
        message({
          id: 'jpg',
          conv: 'c-k1',
          sender: 'customer',
          at,
          type: 'image',
          text: 'إيصال التحويل',
          media: { url: URL_JPG, mime: 'image/jpeg' },
        }),
        message({
          id: 'sent',
          conv: 'c-k1',
          sender: 'agent',
          at,
          type: 'document',
          text: 'الفاتورة',
          media: { url: URL_PDF, mime: 'application/pdf' },
        }),
        message({ id: 'text', conv: 'c-k1', sender: 'customer', at, text: 'السلام عليكم' }),
        message({ id: 'nomime', conv: 'c-k1', sender: 'customer', at, text: 'رابط', media: { url: URL_PDF, mime: '' } }),
      ],
    }),
  }),
);
const cols = (id: string) => {
  const m = out.find((x) => x.ref.id === id);
  return m?.ok ? m.value.columns : undefined;
};

describe('mapMessages: inbound files', () => {
  it('an inbound document: body = its CRM link, media_name = its file name', () => {
    expect(cols('pdf')).toMatchObject({
      body: URL_PDF,
      media_mime: 'application/pdf',
      media_name: 'Transaction-Receipt.pdf',
    });
  });

  it('an inbound photo: body = its link, no media_name (the caption is not a file name)', () => {
    expect(cols('jpg')).toMatchObject({ body: URL_JPG, media_mime: 'image/jpeg' });
    expect(cols('jpg')).not.toHaveProperty('media_name');
  });

  it('outbound keeps text first and adds no media_name key', () => {
    expect(cols('sent')).toMatchObject({ body: 'الفاتورة' });
    expect(cols('sent')).not.toHaveProperty('media_name');
  });

  it('a text, or a link without a mime, is unchanged: its text, no media_name key (same hash)', () => {
    expect(cols('text')).toMatchObject({ body: 'السلام عليكم', media_mime: null });
    expect(cols('text')).not.toHaveProperty('media_name');
    expect(cols('nomime')).toMatchObject({ body: 'رابط' });
    expect(cols('nomime')).not.toHaveProperty('media_name');
  });
});
