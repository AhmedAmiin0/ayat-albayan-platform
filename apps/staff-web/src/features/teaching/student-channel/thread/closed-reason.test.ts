import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { closedText } from './closed-reason';

const c = t.studentChannel;

describe('closedText: the closed line follows the page\'s closed_reason', () => {
  it('each reason has its own line', () => {
    expect(closedText('not_subscribed')).toBe(c.closedReasons.not_subscribed);
    expect(closedText('no_teacher')).toBe(c.closedReasons.no_teacher);
    expect(closedText('family_chat_off')).toBe(c.closedReasons.family_chat_off);
    expect(closedText('no_teacher')).not.toBe(c.closed);
  });

  it('absent or unknown: the subscription line as before', () => {
    expect(closedText(undefined)).toBe(c.closed);
    expect(closedText(null)).toBe(c.closed);
    expect(closedText('toString')).toBe(c.closed);
    expect(closedText('later')).toBe(c.closed);
  });
});
