import { describe, expect, it } from 'vitest';
import {
  historyInbound,
  inboundSince,
  isLate,
  LATE_MS,
  LOOKBACK_MS,
  MAX_BACK_MS,
} from './inbound-history';
import { FAMILY_WA, GAP_AT, kapsoInbound, NOW } from './inbound.fakes';

const AT = { line: 'chat' as const, numberId: 'n-1', phoneNumberId: 'kapso-chat-1' };
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe('historyInbound: Kapso history item → the webhook InboundEvent', () => {
  it('a text: wamid, sender, WhatsApp time, body, receiving line and number', () => {
    expect(historyInbound(kapsoInbound(), AT)).toMatchObject({
      waMessageId: 'wamid.IN1',
      from: FAMILY_WA,
      at: GAP_AT,
      type: 'text',
      body: 'السلام عليكم، متى الحلقة؟',
      payload: null,
      ...AT,
    });
  });

  it('a reply keeps context.id; an ISO timestamp is read as Meta seconds', () => {
    const m = kapsoInbound({ context: { id: 'wamid.OUT9' }, timestamp: GAP_AT.toISOString() });
    expect(historyInbound(m, AT)).toMatchObject({ replyTo: 'wamid.OUT9', at: GAP_AT });
  });

  it('a reaction keeps its target in the payload (InboundReactions reads it)', () => {
    const reaction = { message_id: 'wamid.OUT9', emoji: '👍' };
    const e = historyInbound(kapsoInbound({ type: 'reaction', text: undefined, reaction }), AT);
    expect(e).toMatchObject({ type: 'reaction', payload: { type: 'reaction', reaction } });
  });

  it('a sticker and an image: media id; mime from Meta, else Kapso media_data', () => {
    const part = { text: undefined, sticker: { id: 'st-1', mime_type: 'image/webp' } };
    const sticker = kapsoInbound({ type: 'sticker', ...part });
    expect(historyInbound(sticker, AT)).toMatchObject({ mediaId: 'st-1', mediaMime: 'image/webp' });
    const kapso = { direction: 'inbound', media_data: { content_type: 'image/jpeg' } };
    const image = kapsoInbound({
      ...{ type: 'image', text: undefined, kapso },
      image: { id: 'img-1', caption: 'الإيصال' },
    });
    expect(historyInbound(image, AT)).toMatchObject({
      mediaId: 'img-1',
      mediaMime: 'image/jpeg',
      body: 'الإيصال',
    });
  });

  it('only a business-scoped from_user_id: the sender is Kapso phone_number', () => {
    const m = kapsoInbound({ from: undefined, from_user_id: 'US.123' });
    expect(historyInbound(m, AT)?.from).toBe(FAMILY_WA);
  });

  it('outbound, echoes, no sender or no time → null', () => {
    expect(historyInbound(kapsoInbound({ kapso: { direction: 'outbound' } }), AT)).toBeNull();
    expect(historyInbound(kapsoInbound({ kapso: undefined }), AT)).toBeNull();
    const noSender = kapsoInbound({ from: undefined, kapso: { direction: 'inbound' } });
    expect(historyInbound(noSender, AT)).toBeNull();
    expect(historyInbound(kapsoInbound({ timestamp: undefined }), AT)).toBeNull();
    expect(historyInbound(null, AT)).toBeNull();
  });
});

describe('inboundSince', () => {
  it('none stored, or the first run after a deploy → 7 days back (the cap)', () => {
    expect(inboundSince(null, { now: NOW, full: false })).toEqual(ago(MAX_BACK_MS));
    expect(inboundSince(ago(60_000), { now: NOW, full: true })).toEqual(ago(MAX_BACK_MS));
  });

  it('the newest inbound row, or the last day when that is newer; never past 7 days', () => {
    const gap = new Date('2026-10-28T08:49:00Z');
    expect(inboundSince(gap, { now: NOW, full: false })).toEqual(gap);
    expect(inboundSince(ago(60_000), { now: NOW, full: false })).toEqual(ago(LOOKBACK_MS));
    const old = new Date('2026-10-01T00:00:00Z');
    expect(inboundSince(old, { now: NOW, full: false })).toEqual(ago(MAX_BACK_MS));
  });

  it('late = older than 15 minutes when stored', () => {
    expect(LATE_MS).toBe(15 * 60_000);
    expect(isLate(ago(LATE_MS + 1), NOW)).toBe(true);
    expect(isLate(ago(LATE_MS), NOW)).toBe(false);
  });
});
