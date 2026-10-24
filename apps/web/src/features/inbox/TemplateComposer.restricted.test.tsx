import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { message, PHONE, template } from './inbox-fixture';
import { InboxModeContext, type InboxMode } from './mode';
import { TemplateComposer } from './TemplateComposer';
import { renderWithClient, routeFetch } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } } }));

// Owner 2026-10-12: teachers, sales and every role without templates.send_all get only the allow-list.
const INVITE = template({ key: 'free_trial_invite', meta_name: 'free_trial_invite', body_ar: 'أهلًا {{1}}، موعد {{2}}', params: ['var_1', 'var_2'], line: 'chat', sales_starter: true });
const field = (n: string) => screen.getByLabelText(t.inbox.composer.param.replace('{n}', n), { exact: true });

function show(input: { mode: InboxMode; rows: unknown[]; permissions?: string[]; role?: string }) {
  routeFetch(apiFetch, [
    ['/auth/me', { id: 'u1', email: null, role: input.role ?? input.mode, permissions: input.permissions ?? ['messages.read'] }],
    ['/messaging/templates', input.rows],
  ]);
  renderWithClient(
    <InboxModeContext.Provider value={input.mode}>
      <TemplateComposer phone={PHONE} context={{}} teacher={false} />
    </InboxModeContext.Provider>,
  );
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('TemplateComposer — restricted roles', () => {
  it('a teacher picks free_trial_invite, fills «المتغير n» and sends it, with no lesson to pick', async () => {
    show({ mode: 'teacher', rows: [INVITE] });
    await screen.findByRole('option', { name: t.templates.names.free_trial_invite }); // by its Arabic name, not the Meta key
    fireEvent.change(screen.getByRole('combobox', { name: t.inbox.composer.chooseTemplate }), { target: { value: 'free_trial_invite' } });
    fireEvent.change(field('1'), { target: { value: 'ياسمين' } });
    fireEvent.change(field('2'), { target: { value: 'الأحد' } });
    expect(screen.queryByText(t.inbox.composer.pickLesson)).toBeNull();
    apiSend.mockResolvedValue(message({ id: 'm-1', direction: 'outbound', status: 'queued' }));
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', expect.stringMatching(/\/template$/), expect.objectContaining({ key: 'free_trial_invite', params: { '1': 'ياسمين', '2': 'الأحد' } })),
    );
  });

  // W7: what she can do instead of a disabled select and button.
  it.each(['teacher', 'sales'] as const)('%s with nothing on the list reads the help line, no select or button', async (mode) => {
    show({ mode, rows: [] });
    expect(await screen.findByText(t.inbox.composer.noAllowedHelp)).toBeTruthy();
    expect(screen.queryByText(t.inbox.composer.noApproved)).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: t.inbox.composer.sendTemplate })).toBeNull();
  });

  // W12: an edited role without messages.read never asks for the template list.
  it('sales without messages.read makes no /messaging/templates request', async () => {
    show({ mode: 'sales', rows: [INVITE], permissions: [] });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/auth/me'));
    expect(await screen.findByText(t.inbox.composer.noPermissionHelp)).toBeTruthy(); // round 2 J
    await new Promise((r) => setTimeout(r, 20));
    expect(apiFetch).not.toHaveBeenCalledWith('/messaging/templates');
  });

  it('a limited role in the admin inbox (no templates.send_all) reads the same', async () => {
    show({ mode: 'admin', rows: [], permissions: ['messages.read'] });
    expect(await screen.findByText(t.inbox.composer.noAllowed)).toBeTruthy();
  });

  it('an assistant (sales) granted templates.manage still reads the allow-list note (owner 2026-10-15)', async () => {
    show({ mode: 'admin', role: 'sales', rows: [], permissions: ['messages.read', 'templates.manage'] });
    expect(await screen.findByText(t.inbox.composer.noAllowed)).toBeTruthy();
  });

  it('the admin keeps the plain empty note', async () => {
    show({ mode: 'admin', rows: [], permissions: ['messages.read', 'templates.manage'] });
    expect(await screen.findByText(t.inbox.composer.noApproved)).toBeTruthy();
  });
});
