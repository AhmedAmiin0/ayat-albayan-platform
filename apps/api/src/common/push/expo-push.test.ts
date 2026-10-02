import { PUSH_KINDS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { expoMessages, pushText, readTickets } from './expo-push';

describe('pushText (ar.json notifications)', () => {
  it('fills the slots of each kind', () => {
    expect(pushText('new_message', { name: 'أم سهيلة', text: 'تمام' })).toEqual({
      title: 'رسالة جديدة من أم سهيلة',
      body: 'تمام',
    });
    expect(pushText('payment_due', { student: 'سهيلة', left: 'فاضل حلقتين' }).body).toBe('باقة سهيلة: فاضل حلقتين');
  });

  it('every kind has text; a missing slot stays visible', () => {
    for (const kind of PUSH_KINDS) expect(pushText(kind, {}).title).toBeTruthy();
    expect(pushText('new_message', {}).title).toContain('{name}');
  });
});

describe('expoMessages / readTickets (R-MOB-01)', () => {
  const tokens = ['ExponentPushToken[a]', 'ExponentPushToken[b]'];

  it('one message per device on the admin channel', () => {
    const msgs = expoMessages(tokens, { title: 't', body: 'b' }, { kind: 'new_lead', phone: '+966500000001' });
    expect(msgs).toEqual(
      tokens.map((to) => ({
        to,
        title: 't',
        body: 'b',
        data: { kind: 'new_lead', phone: '+966500000001' },
        sound: 'default',
        channelId: 'default',
      })),
    );
  });

  it('collects ticket ids and the tokens Expo says are gone', () => {
    const outcome = readTickets(tokens, [
      { status: 'ok', id: 't-1' },
      { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
    ]);
    expect(outcome).toEqual({ ticketIds: ['t-1'], deadTokens: ['ExponentPushToken[b]'], error: null });
  });

  it('reports the first error when no device took it', () => {
    const outcome = readTickets(tokens, [
      { status: 'error', message: 'rate limited', details: { error: 'MessageRateExceeded' } },
      { status: 'error', message: 'too big' },
    ]);
    expect(outcome).toEqual({ ticketIds: [], deadTokens: [], error: 'rate limited' });
  });
});
