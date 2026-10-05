import { describe, expect, it } from 'vitest';
import { isInboxPath } from './inbox-route';

describe('isInboxPath', () => {
  it.each(['/admin/inbox', '/sales/inbox', '/teacher/inbox', '/admin/inbox/'])('%s is an inbox', (p) => {
    expect(isInboxPath(p)).toBe(true);
  });

  it.each(['/admin', '/admin/leads', '/admin/inbox-settings', '/portal/inbox', undefined])('%s is not', (p) => {
    expect(isInboxPath(p)).toBe(false);
  });
});
