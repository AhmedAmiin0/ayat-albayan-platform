import type { ThreadDetail, TeacherMe } from '@ab/shared';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { detail, message, PHONE, thread } from './testing/inbox-fixture';
import { InboxModeContext, type InboxMode } from './mode';
import { renderWithClient, routeFetch } from './testing/test-utils';
import { ThreadPane } from './ThreadPane';
import { ThreadRow } from './ThreadRow';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./testing/test-utils')).MockLink }));

const ME = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] } as unknown as TeacherMe;
const FAMILY = { guardian_id: 'g-1', lead_id: null, lead_status: null, lead_source: null } as const;
// Every way the number is written on screen: grouped, bare, and its last four digits.
const SHOWN = ['+966 50 123 4567', '966501234567', '4567'];

function page(patch: Partial<ThreadDetail['thread'] & object>): ThreadDetail {
  return { ...detail([message({ body: 'السلام عليكم' })], { ...FAMILY, ...patch }), people: { guardian: null, lead: null, students: [] } };
}

function renderPane(mode: InboxMode, body: ThreadDetail) {
  routeFetch(apiFetch, [['/threads/%2B966501234567', body], ['/messaging/templates', []], ['/teachers/me', ME]]);
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </InboxModeContext.Provider>,
  );
}

function renderRow(mode: InboxMode, patch: Parameters<typeof thread>[0]) {
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ul><ThreadRow thread={thread({ ...FAMILY, ...patch })} search={{ page: 1 }} active={false} /></ul>
    </InboxModeContext.Provider>,
  );
}

/** What a person can read or hear: text and every accessible name, never the route's href. */
function readable(): string {
  const labels = [...document.querySelectorAll('[aria-label],[title],[placeholder]')].map(
    (el) => `${el.getAttribute('aria-label')} ${el.getAttribute('title')} ${el.getAttribute('placeholder')}`,
  );
  return `${document.body.textContent} ${labels.join(' ')}`;
}

afterEach(() => apiFetch.mockReset());

describe('teacher chat never shows the number', () => {
  it('list row: a named guardian shows the name only', () => {
    renderRow('teacher', { display_name: 'أم سهيلة' });
    expect(screen.getByText('أم سهيلة')).toBeTruthy();
    for (const s of SHOWN) expect(readable()).not.toContain(s);
  });

  it('list row: no name says who it is, not the number', () => {
    renderRow('teacher', { display_name: null });
    expect(screen.getAllByText(t.inbox.kind.guardian)).toHaveLength(2);
    for (const s of SHOWN) expect(readable()).not.toContain(s);
  });

  it('header, bubbles and composer: no digits of the number, named or not', async () => {
    renderPane('teacher', page({ display_name: 'أم سهيلة' }));
    expect(await screen.findByText('السلام عليكم')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'أم سهيلة' })).toBeTruthy();
    for (const s of SHOWN) expect(readable()).not.toContain(s);
  });

  it('an unnamed thread’s header says who it is', async () => {
    renderPane('teacher', page({ display_name: null }));
    expect(await screen.findByRole('heading', { name: t.inbox.kind.guardian })).toBeTruthy();
    for (const s of SHOWN) expect(readable()).not.toContain(s);
  });

  it('the admin still sees the number in the row and the header', async () => {
    renderRow('admin', { display_name: 'أم سهيلة' });
    expect(readable()).toContain('+966 50 123 4567');
    renderPane('admin', page({ display_name: null }));
    expect(await screen.findByRole('heading', { name: '+966 50 123 4567' })).toBeTruthy();
  });
});
