import type { ChannelClosedReason } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { closedReasonKey } from './channel-closed';

describe('closedReasonKey', () => {
  it('each known reason is its own key', () => {
    expect(closedReasonKey('not_subscribed')).toBe('not_subscribed');
    expect(closedReasonKey('no_teacher')).toBe('no_teacher');
    expect(closedReasonKey('family_chat_off')).toBe('family_chat_off');
  });

  it('absent or unknown: before the subscription', () => {
    expect(closedReasonKey(null)).toBe('not_subscribed');
    expect(closedReasonKey(undefined)).toBe('not_subscribed');
    expect(closedReasonKey('toString' as ChannelClosedReason)).toBe('not_subscribed');
  });
});
