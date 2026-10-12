import { describe, expect, it } from 'vitest';
import { PUSH_KINDS } from '../enums/index.js';
import { mayReceivePush, PUSH_KIND_PERMISSIONS } from './kind-permissions.js';

describe('PUSH_KIND_PERMISSIONS (R-NOT-01)', () => {
  it('every kind needs notifications.push', () => {
    for (const kind of PUSH_KINDS)
      expect(PUSH_KIND_PERMISSIONS[kind]).toContain('notifications.push');
  });

  it('inbox kinds also need inbox.read', () => {
    expect(mayReceivePush('new_lead', ['notifications.push'])).toBe(false);
    expect(mayReceivePush('new_message', ['notifications.push', 'inbox.read'])).toBe(true);
    expect(mayReceivePush('reminder_failed', ['inbox.read'])).toBe(false);
  });

  it('other kinds need only the bell', () => {
    expect(mayReceivePush('new_student', ['notifications.push'])).toBe(true);
    expect(mayReceivePush('new_student', [])).toBe(false);
  });
});
