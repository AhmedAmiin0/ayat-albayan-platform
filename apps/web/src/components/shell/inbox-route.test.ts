import { describe, expect, it } from 'vitest';
import { INBOX_PAGE, INBOX_PAGE_TOPBAR, isInboxPath } from './inbox-route';

describe('isInboxPath', () => {
  it.each(['/admin/inbox', '/sales/inbox', '/teacher/inbox', '/admin/inbox/'])('%s is an inbox', (p) => {
    expect(isInboxPath(p)).toBe(true);
  });

  it.each(['/admin', '/admin/leads', '/admin/inbox-settings', '/portal/inbox', undefined])('%s is not', (p) => {
    expect(isInboxPath(p)).toBe(false);
  });
});

describe('inbox page classes', () => {
  it('the admin shell keeps INBOX_PAGE exactly (phone padding only)', () => {
    expect(INBOX_PAGE).toBe('max-sm:px-2 max-sm:pt-2 max-sm:pb-1 max-sm:[&>div]:pb-0');
  });

  it('the top-bar inbox drops the outer margin and insets 12px from 900px, keeping the phone padding', () => {
    const classes = INBOX_PAGE_TOPBAR.split(' ');
    expect(classes).toEqual(expect.arrayContaining(['shell:m-0', 'shell:px-3', 'shell:pt-3', 'shell:pb-3']));
    expect(classes).toEqual(expect.arrayContaining(INBOX_PAGE.split(' ')));
  });
});
