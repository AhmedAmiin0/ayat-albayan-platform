import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { canRetry, outboundNotes } from './message-notes';

// Owner 2026-11-01: a payment link leaves as a text; WhatsApp's 131047 shows on its own bubble.

const NOW = new Date('2026-11-01T12:00:00Z');
const C24 = { cycle: '24', locale } as const;
const body = 'رابط الدفع: https://app.example.test/pay/tok_1';

describe('a refused payment link', () => {
  it('131047 on its bubble, as for any text: the reason, no blind retry', () => {
    const row = message({ id: 'm-link', direction: 'outbound', body, status: 'failed', error_code: '131047' });
    const notes = outboundNotes(row, { waitingTemplate: false, now: NOW, clock: C24 });
    expect(notes).toEqual([t.messages.errorLine.replace('{reason}', t.messages.errors['131047'])]);
    expect(canRetry(row)).toBe(false);
  });
});
