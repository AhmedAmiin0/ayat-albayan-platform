import { afterEach, describe, expect, it } from 'vitest';
import { setCallsNumber } from '@/common/configuration/integrations/calls-number';
import {
  CHAT_PHONE_NUMBER_ID,
  envelope,
  inboundValue,
  PHONE_NUMBER_ID,
  TS,
  TS_DATE,
  textPart,
} from './meta.fakes';
import { liveWebhookConfig } from './webhook.config';
import { parseWebhook } from './parse/webhook.parse';
import { loadEnv } from '@/config/env/env';

// The dedicated calls number (docs/28 §10): its changes are kept under legacy too, stamped line
// `calls`; a family's call_permission_reply is read beside the stored message.

const NOW = new Date('2026-10-27T10:00:00Z');
const CALLS = { id: 'n-calls', purpose: 'calls' as const, phone_number_id: 'pid-calls' };
const LEGACY = { notifications: PHONE_NUMBER_ID, chat: CHAT_PHONE_NUMBER_ID };
const callsChange = (pid: string) => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          field: 'calls',
          value: {
            metadata: { phone_number_id: pid },
            calls: [
              {
                id: 'wacid.1',
                event: 'connect',
                from: '201001234567',
                direction: 'USER_INITIATED',
                session: { sdp: 'v=0' },
              },
            ],
          },
        },
      ],
    },
  ],
});
const reply = (response: string, extra: object = {}) => ({
  type: 'interactive',
  interactive: {
    type: 'call_permission_reply',
    call_permission_reply: { response, is_permanent: false, ...extra },
  },
});

afterEach(() => setCallsNumber(null));

describe('parseWebhook and the calls number (legacy)', () => {
  it('a message to the calls number lands stamped line calls and its number (never chat or notifications)', () => {
    const batch = parseWebhook(envelope(inboundValue(textPart('سلام')), 'pid-calls'), {
      now: NOW,
      numbers: LEGACY,
      calls: CALLS,
    });
    expect(batch.messages[0]).toMatchObject({
      line: 'calls',
      numberId: 'n-calls',
      phoneNumberId: 'pid-calls',
    });
  });

  it('its calls change reaches the calls flow; without a calls number the same id is ignored as before', () => {
    expect(
      parseWebhook(callsChange('pid-calls'), { now: NOW, numbers: LEGACY, calls: CALLS }).calls,
    ).toHaveLength(1);
    expect(
      parseWebhook(callsChange('pid-calls'), { now: NOW, numbers: LEGACY }).calls,
    ).toBeUndefined();
  });

  it('the chat and notifications lines are untouched by a calls number', () => {
    const batch = parseWebhook(envelope(inboundValue(textPart('x')), CHAT_PHONE_NUMBER_ID), {
      now: NOW,
      numbers: LEGACY,
      calls: CALLS,
    });
    expect(batch.messages[0]?.line).toBe('chat');
  });

  it('module mode finds it in the overlay (purpose calls)', () => {
    const overlay = [{ id: 'n-calls', purpose: 'calls' as const, phone_number_id: 'pid-calls' }];
    expect(
      parseWebhook(envelope(inboundValue(textPart('x')), 'pid-calls'), { now: NOW, overlay })
        .messages[0],
    ).toMatchObject({ line: 'calls', numberId: 'n-calls' });
  });

  it('liveWebhookConfig names the installed calls number, null without one', () => {
    const config = liveWebhookConfig(loadEnv);
    expect(config.calls).toBeNull();
    setCallsNumber({ id: 'n-calls', phoneNumberId: 'pid-calls', env: null });
    expect(config.calls).toEqual(CALLS);
  });
});

describe('call_permission_reply', () => {
  it('accept with its expiry, reject without one; the message is still stored', () => {
    const exp = TS + 7 * 86_400;
    const accepted = parseWebhook(
      envelope(inboundValue(reply('accept', { expiration_timestamp: exp })), 'pid-calls'),
      { now: NOW, calls: CALLS },
    );
    expect(accepted.permissions).toEqual([
      {
        phoneNumberId: 'pid-calls',
        from: '966501234567',
        response: 'accepted',
        expiresAt: new Date(exp * 1000),
        at: TS_DATE,
      },
    ]);
    expect(accepted.messages).toHaveLength(1);
    const rejected = parseWebhook(
      envelope(inboundValue(reply('reject', { expiration_timestamp: exp })), 'pid-calls'),
      { now: NOW, calls: CALLS },
    );
    expect(rejected.permissions?.[0]).toMatchObject({ response: 'rejected', expiresAt: null });
  });

  it('anything else (another interactive, an unknown answer, an ignored number) is no permission event', () => {
    const other = parseWebhook(envelope(inboundValue(textPart('نعم')), 'pid-calls'), {
      now: NOW,
      calls: CALLS,
    });
    expect(other.permissions ?? []).toEqual([]);
    expect(
      parseWebhook(envelope(inboundValue(reply('maybe')), 'pid-calls'), { now: NOW, calls: CALLS })
        .permissions ?? [],
    ).toEqual([]);
    expect(
      parseWebhook(envelope(inboundValue(reply('accept')), 'unknown'), {
        now: NOW,
        numbers: LEGACY,
      }).permissions,
    ).toBeUndefined();
  });
});
