import { describe, expect, it, vi } from 'vitest';
import { sendViaWhatsApp, whatsappDigits, whatsappSendUrl } from './whatsapp-send.js';

const PHONE = '+966500000001';

describe('whatsappSendUrl', () => {
  it('digits only: E.164 without the +', () => {
    expect(whatsappDigits(PHONE)).toBe('966500000001');
    expect(whatsappDigits(' +20 100 000 0002 ')).toBe('201000000002');
  });

  it('web opens WhatsApp Web, mobile opens wa.me', () => {
    expect(whatsappSendUrl('web', { phone: PHONE, text: 'hi' })).toBe(
      'https://web.whatsapp.com/send?phone=966500000001&text=hi',
    );
    expect(whatsappSendUrl('mobile', { phone: PHONE, text: 'hi' })).toBe(
      'https://wa.me/966500000001?text=hi',
    );
  });

  it('encodes Arabic, line breaks, emoji, & and ? so the text arrives whole', () => {
    const text = 'السلام عليكم\nموعد الحلقة غدًا 🌙 & شكرًا؟';
    const url = whatsappSendUrl('mobile', { phone: PHONE, text });
    expect(url).not.toMatch(/\s|\n|&(?!text)/);
    expect(url).toContain('%0A');
    expect(decodeURIComponent(new URL(url).searchParams.get('text') ?? '')).toBe(text);
    const web = new URL(whatsappSendUrl('web', { phone: PHONE, text }));
    expect(web.searchParams.get('text')).toBe(text);
    expect(web.searchParams.get('phone')).toBe('966500000001');
  });
});

describe('sendViaWhatsApp: the pending window first, then open', () => {
  it('app-send, then opens: opened', async () => {
    const order: string[] = [];
    const start = vi.fn(async () => (order.push('app-send'), 'row'));
    const open = vi.fn(async () => (order.push('open'), true));
    await expect(sendViaWhatsApp({ start, open })).resolves.toEqual({ row: 'row', opened: true });
    expect(order).toEqual(['app-send', 'open']);
  });

  it('a refused app-send (409) throws and never opens WhatsApp', async () => {
    const open = vi.fn(() => true);
    const start = vi.fn(() => Promise.reject(new Error('not_app_send')));
    await expect(sendViaWhatsApp({ start, open })).rejects.toThrow('not_app_send');
    expect(open).not.toHaveBeenCalled();
  });

  it('WhatsApp did not open (false or a throw): the pending row, opened false', async () => {
    const start = async () => 'row';
    await expect(sendViaWhatsApp({ start, open: () => false })).resolves.toEqual({ row: 'row', opened: false });
    const boom = () => Promise.reject(new Error('no handler'));
    await expect(sendViaWhatsApp({ start, open: boom })).resolves.toEqual({ row: 'row', opened: false });
  });
});
