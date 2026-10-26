import { describe, expect, it } from 'vitest';
import type { StatusEvent } from '../webhook.events';
import { nextStatus, statusPatch, type StatusRow } from './webhook.status';

const AT = new Date('2026-10-02T15:00:00Z');
const ev = (over: Partial<StatusEvent> = {}): StatusEvent => ({
  waMessageId: 'wamid.1',
  status: 'delivered',
  at: AT,
  errorCode: null,
  errorText: null,
  conversationId: null,
  pricingCategory: null,
  ...over,
});
const row = (over: Partial<StatusRow> = {}): StatusRow => ({
  status: 'sent',
  sent_at: '2026-10-02T14:59:00.000Z',
  delivered_at: null,
  read_at: null,
  ...over,
});

describe('nextStatus', () => {
  it('moves forward along queued < sent < delivered < read', () => {
    expect(nextStatus('queued', 'sent')).toBe('sent');
    expect(nextStatus('sent', 'delivered')).toBe('delivered');
    expect(nextStatus('delivered', 'read')).toBe('read');
    expect(nextStatus('sent', 'read')).toBe('read');
  });

  it('never moves back or repeats', () => {
    expect(nextStatus('read', 'delivered')).toBeNull();
    expect(nextStatus('delivered', 'sent')).toBeNull();
    expect(nextStatus('delivered', 'delivered')).toBeNull();
  });

  it('fails from anything but read; a failed or manual row stays', () => {
    expect(nextStatus('queued', 'failed')).toBe('failed');
    expect(nextStatus('delivered', 'failed')).toBe('failed');
    expect(nextStatus('read', 'failed')).toBeNull();
    expect(nextStatus('failed', 'delivered')).toBeNull();
    expect(nextStatus('failed', 'failed')).toBeNull();
    expect(nextStatus('sent_manually', 'read')).toBeNull();
  });
});

describe('statusPatch', () => {
  it('stamps delivered_at from Meta’s timestamp and keeps sent_at', () => {
    expect(statusPatch(row(), ev())).toEqual({
      status: 'delivered',
      sent_at: '2026-10-02T14:59:00.000Z',
      delivered_at: AT.toISOString(),
    });
  });

  it('fills skipped steps when read arrives first', () => {
    expect(statusPatch(row({ status: 'queued', sent_at: null }), ev({ status: 'read' }))).toEqual({
      status: 'read',
      sent_at: AT.toISOString(),
      delivered_at: AT.toISOString(),
      read_at: AT.toISOString(),
    });
  });

  it('keeps the conversation id and pricing category', () => {
    const patch = statusPatch(row(), ev({ conversationId: 'conv-1', pricingCategory: 'utility' }));
    expect(patch).toMatchObject({ wa_conversation_id: 'conv-1', wa_pricing_category: 'utility' });
  });

  it('records Meta’s error on failed', () => {
    const failed = ev({ status: 'failed', errorCode: '131026', errorText: 'Message undeliverable' });
    expect(statusPatch(row(), failed)).toEqual({
      status: 'failed',
      error_code: '131026',
      error_text: 'Message undeliverable',
    });
    expect(statusPatch(row(), ev({ status: 'failed' }))).toMatchObject({ error_code: 'unknown' });
  });

  it('is null when nothing changes (replayed or late status)', () => {
    expect(statusPatch(row({ status: 'read' }), ev())).toBeNull();
    expect(statusPatch(row({ status: 'delivered' }), ev())).toBeNull();
  });
});
