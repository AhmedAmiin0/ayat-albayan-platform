import { describe, expect, it } from 'vitest';
import { SESSION_GROUPS, type SessionGroup } from './session-groups';

describe('classroom board groups', () => {
  it('lists the groups in reading order: open now, still to open, closed', () => {
    const order: SessionGroup[] = ['now', 'upcoming', 'ended'];
    expect(SESSION_GROUPS).toEqual(order);
  });
});
