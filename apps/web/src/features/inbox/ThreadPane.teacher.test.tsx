import type { TeacherMe, ThreadDetail } from '@ab/shared';
import { screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { detail, message, PHONE, pupil, thread } from './testing/inbox-fixture';
import { InboxModeContext, type InboxMode } from './mode';
import { renderWithClient, routeFetch } from './testing/test-utils';
import { ThreadPane } from './ThreadPane';
import { ThreadRow } from './ThreadRow';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./testing/test-utils')).MockLink }));

const ME = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] } as unknown as TeacherMe;
const FAMILY = { guardian_id: 'g-1', lead_id: null, lead_status: null, lead_source: null } as const;
// A failed send by the teacher: the admin may retry it; the teacher only sees who sent it.
const SENT = { ...message({ id: 'm-out', direction: 'outbound', status: 'failed', body: 'تمام' }), sent_by_teacher_name: 'أبرار' };

function render(mode: InboxMode, ui: ReactElement) {
  renderWithClient(<InboxModeContext.Provider value={mode}>{ui}</InboxModeContext.Provider>);
}

function renderThread(mode: InboxMode, page: ThreadDetail) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', page],
    ['/messaging/templates', []],
    ['/teachers/me', ME],
  ]);
  render(mode, <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

const family = (): ThreadDetail => ({
  ...detail([SENT], FAMILY),
  people: { guardian: { id: 'g-1', name: 'أم سهيلة' }, lead: null, students: [pupil({}, null)] },
});

afterEach(() => apiFetch.mockReset());

describe('teacher mode in the chat (R-TCH-03, R-MSG-05)', () => {
  it('a family I teach: the log, «أرسلها: أبرار» and the reply box; no admin panel or message actions', async () => {
    renderThread('teacher', family());
    expect(await screen.findByText(t.inbox.sentBy.replace('{name}', 'أبرار'))).toBeTruthy();
    expect(screen.getByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeTruthy();
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByRole('button', { name: t.messages.retry })).toBeNull();
    expect(apiFetch.mock.calls.some(([path]) => String(path).startsWith('/leads'))).toBe(false);
  });

  it('the admin sees the same message with its actions and the teacher who sent it', async () => {
    renderThread('admin', family());
    expect(await screen.findByText(t.inbox.sentBy.replace('{name}', 'أبرار'))).toBeTruthy();
    expect(screen.getByRole('button', { name: t.messages.retry })).toBeTruthy();
  });

  it('my own chat with the academy is read-only', async () => {
    renderThread('teacher', detail([message()], { lead_id: null, lead_status: null, teacher_id: 't-abrar', teacher_name: 'أبرار' }));
    expect(await screen.findByText(t.inbox.ownThreadReadOnly)).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeNull();
  });

  it('a thread row opens /teacher/inbox and carries no lead source or «مشترك»', () => {
    const th = thread({ ...FAMILY, subscribed: true, lead_source: 'facebook_ad' });
    render('teacher', <ul><ThreadRow thread={th} search={{ page: 1 }} active={false} /></ul>);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(`/teacher/inbox?page=1&phone=${encodeURIComponent(PHONE)}`);
    expect(within(link).queryByText(t.enums.leadSource.facebook_ad)).toBeNull();
    expect(within(link).queryByText(t.inbox.subscription.badge.subscribed)).toBeNull();
  });
});
