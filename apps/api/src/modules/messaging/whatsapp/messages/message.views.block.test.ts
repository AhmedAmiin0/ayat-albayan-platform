import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import { blockOf, MessageViews } from './message.views';
import { messageRow } from '../sender/sender.fakes';
import type { TemplatesQueries } from '../templates/catalog/templates.queries';
import { REPORT_READY, templateRow } from '../whatsapp.fakes';

// The template block of a message view (owner 2026-10-28): header, footer and buttons like WhatsApp.

const views = (rows: Record<string, ReturnType<typeof templateRow>>) => {
  const cached = vi.fn(async (key: string) => rows[key] ?? null);
  const storage = { signedUrl: vi.fn(async () => 'https://storage.local/x') } as unknown as StorageService;
  return { cached, views: new MessageViews({ cached } as unknown as TemplatesQueries, storage) };
};

describe('blockOf', () => {
  it('a URL button with its meeting code filled, the footer, no header', () => {
    const block = blockOf(messageRow(), templateRow({ buttons: [{ type: 'url', url: 'https://meet.jit.si/{{1}}', text: 'ادخل الحلقة' }] }));
    expect(block).toEqual({
      header: null,
      footer: 'أكاديمية آيات البيان',
      buttons: [{ type: 'url', text: 'ادخل الحلقة', url: 'https://meet.jit.si/ab-sara-x1' }],
    });
  });

  it('a document header from header_format (report_ready) before any sync', () => {
    expect(blockOf(messageRow({ template_key: 'report_ready' }), REPORT_READY)?.header).toEqual({ type: 'document' });
  });

  it('the synced display wins: a text header and call / copy-code buttons', () => {
    const display = {
      header: { type: 'text', text: 'تذكير' },
      buttons: [
        { type: 'phone_number', text: 'اتصل', phone: '+966500000000' },
        { type: 'copy_code', text: 'نسخ الرمز' },
      ],
    };
    const block = blockOf(messageRow(), templateRow({ display }));
    expect(block?.header).toEqual({ type: 'text', text: 'تذكير' });
    expect(block?.buttons.map((b) => b.type)).toEqual(['phone_number', 'copy_code']);
  });

  it('a malformed display reads as never synced (the columns)', () => {
    const block = blockOf(messageRow(), templateRow({ display: { header: 'x', buttons: 3 } }));
    expect(block?.buttons).toEqual([{ type: 'url', text: '', url: 'https://meet.jit.si/ab-sara-x1' }]);
  });

  it('a row that stored its own text (imported history) has no block: it renders as before', () => {
    expect(blockOf(messageRow({ body: 'نص محفوظ' }), templateRow())).toBeNull();
  });
});

describe('MessageViews.view', () => {
  it('a template row carries its block; its key is read once from the cache', async () => {
    const { views: v, cached } = views({ booking_confirmation: templateRow() });
    const view = await v.view(messageRow({ status: 'sent' }));
    expect(cached).toHaveBeenCalledWith('booking_confirmation');
    expect(view.template?.footer).toBe('أكاديمية آيات البيان');
    expect(view.body).toBe('تم حجز حلقة سلمى — الأحد 4 أكتوبر 17:00');
  });

  it('a key with no registry row, and a plain text, carry no block', async () => {
    const { views: v } = views({});
    expect((await v.view(messageRow({ status: 'sent' }))).template).toBeNull();
    const text = await v.view(messageRow({ status: 'sent', template_key: null, template_params: null, body: 'سلام' }));
    expect(text.template).toBeNull();
  });
});
