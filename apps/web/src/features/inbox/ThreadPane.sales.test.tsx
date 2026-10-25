import type { ThreadDetail } from '@ab/shared';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detail, message, PHONE, thread } from './inbox-fixture';
import { threadTitle } from './format';
import { InboxModeContext, inboxBase, type InboxMode } from './mode';
import { renderWithClient, routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';
import { ThreadRow } from './ThreadRow';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const GROUPED = '+966 50 123 4567';
const page = (): ThreadDetail => ({
  ...detail([message({ body: 'السلام عليكم' })], { display_name: 'أم سهيلة' }),
  people: { guardian: null, lead: null, students: [] },
});

function renderPane(mode: InboxMode) {
  routeFetch(apiFetch, [['/threads/%2B966501234567', page()], ['/messaging/templates', []], ['/teachers/me', {}]]);
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </InboxModeContext.Provider>,
  );
}

function renderRow(mode: InboxMode) {
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ul><ThreadRow thread={thread({ display_name: 'أم سهيلة' })} search={{ page: 1 }} active={false} /></ul>
    </InboxModeContext.Provider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('inbox sales mode: scoped like the teacher, shown like the admin', () => {
  it('the row shows the number next to the name and links under /sales/inbox', () => {
    renderRow('sales');
    expect(document.body.textContent).toContain(GROUPED);
    expect(screen.getByRole('link').getAttribute('href')).toMatch(/^\/sales\/inbox\?/);
  });

  it('the header shows the number; the page never asks for /teachers/me', async () => {
    renderPane('sales');
    expect(await screen.findByText('السلام عليكم')).toBeTruthy();
    expect(document.body.textContent).toContain(GROUPED);
    expect(apiFetch.mock.calls.map((c) => String(c[0]))).not.toContain('/teachers/me');
  });

  it('an unnamed thread is titled by the number for sales and admin, never for the teacher', () => {
    const th = thread({ display_name: null });
    expect(threadTitle(th, 'sales')).toBe(GROUPED);
    expect(threadTitle(th, 'admin')).toBe(GROUPED);
    expect(threadTitle(th, 'teacher')).not.toContain('966');
  });

  it('teacher mode still hides the number and keeps /teacher/inbox', () => {
    renderRow('teacher');
    expect(document.body.textContent).not.toContain(GROUPED);
    expect(inboxBase('teacher')).toBe('/teacher/inbox');
    expect(inboxBase('admin')).toBe('/admin/inbox');
    expect(inboxBase('sales')).toBe('/sales/inbox');
  });
});
