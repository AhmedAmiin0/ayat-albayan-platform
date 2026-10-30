import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { forgetReopens } from '../lib/use-thread-reopen';
import { Composer } from './Composer';

const apiFetch = vi.hoisted(() => vi.fn());
// The closed window asks POST /threads/:phone/reopen on open: answered here, so no real request
// settles after the test (React 19 then sets state with jsdom already gone).
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch,
  apiSend,
}));
vi.mock('@/lib/http/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } } }));

const THREAD = { phone_e164: '+966501234567', session_open: false, last_inbound_at: null, guardian_id: 'g1', teacher_id: null };
function show(role: 'admin' | 'teacher') {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === '/auth/me') return { id: 'u1', email: null, role };
    if (path === '/messages/gate') return { open: false, reason: 'switch_off' };
    return [];
  });
  apiSend.mockResolvedValue({ kapso_reopened: false, template: 'not_allowed' });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Composer thread={THREAD as never} context={{} as never} />
    </QueryClientProvider>,
  );
}

describe('Composer: the queue note', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    forgetReopens();
  });

  it('a teacher reads the plain version, never the admin’s «الرسايل مستنية في الطابور»', async () => {
    show('teacher');
    expect(await screen.findByText(t.inbox.messagingOffTeacher)).toBeTruthy();
    expect(screen.queryByText(t.inbox.messagingOff)).toBeNull();
  });

  it('the admin keeps the queue wording', async () => {
    show('admin');
    expect(await screen.findByText(t.inbox.messagingOff)).toBeTruthy();
  });
});
