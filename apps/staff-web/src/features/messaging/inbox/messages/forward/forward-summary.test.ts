import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { forwardSummary } from './forward-summary';

const A = '+966500000001';
const B = '+966500000002';

describe('forwardSummary', () => {
  it('counts sent and skipped and names each skipped chat with its reason', () => {
    const res = {
      results: [
        { phone: A, sent: true as const, message_id: 'm1' },
        { phone: B, sent: false as const, reason: 'session_closed' as const },
      ],
    };
    const s = forwardSummary(res, new Map([[A, 'أم سهيلة'], [B, 'أبو خالد']]));
    expect(s.tone).toBe('info');
    expect(s.text.split('\n')).toEqual([
      t.inbox.forward.result.replace('{sent}', '1').replace('{skipped}', '1'),
      `أبو خالد: ${t.inbox.forward.skip.session_closed}`,
    ]);
  });

  it('nothing sent: the error tone; an unnamed chat shows its number', () => {
    const s = forwardSummary({ results: [{ phone: A, sent: false, reason: 'send_failed' }] }, new Map([[A, null]]));
    expect(s.tone).toBe('error');
    expect(s.text).toContain(t.inbox.forward.skip.send_failed);
    expect(s.text).toContain('966');
  });
});
