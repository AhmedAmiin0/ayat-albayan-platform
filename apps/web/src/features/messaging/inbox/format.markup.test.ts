import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { previewText } from './format';
import { thread } from './testing/inbox-fixture';

describe('previewText drops WhatsApp markers (owner 2026-11-06)', () => {
  it('shows the words, not the asterisks', () => {
    expect(previewText(thread({ last_body: '*مرحبًا* _بكم_ ~قديم~' }))).toBe('مرحبًا بكم قديم');
    const ours = thread({ last_direction: 'outbound', last_body: 'موعد ```10:00```' });
    expect(previewText(ours)).toBe(`${t.inbox.you} موعد 10:00`);
  });

  it('keeps a lone or mid-word marker as typed', () => {
    expect(previewText(thread({ last_body: '5*2 = 10 *' }))).toBe('5*2 = 10 *');
  });
});
