import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { meQuery, type Me } from '@/features/people/auth/me';
import { t } from '@/lib/i18n/i18n';
import { AuthorTemplatesPage } from './AuthorTemplatesPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// «القوالب» for sales (owner 2026-11-14): status chips, «تعديل» only where allowed, «قالب جديد».

const S = t.templates.author;
const chat = { line: 'chat' as const, sales_starter: true };
const ROWS = [
  template({ ...chat, key: 'offer_a', status: 'pending', created_by: 'me' }),
  template({ ...chat, key: 'offer_b', status: 'rejected', last_error: 'INVALID_FORMAT', created_by: 'me' }),
  template({ ...chat, key: 'lesson_reminder', status: 'approved', created_by: 'me' }),
  template({ ...chat, key: 'offer_c', status: 'approved', created_by: 'me' }),
  template({ ...chat, key: 'offer_theirs', status: 'approved', created_by: 'someone-else' }),
  template({ ...chat, key: 'offer_seeded', status: 'approved', created_by: null }),
];
const editFor = (key: string) => screen.queryByRole('button', { name: t.templates.edit.openFor.replace('{name}', key) });

/** Signed in as `me` (the author of the offer_* rows but offer_theirs). */
function renderSignedIn() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const me: Me = { id: 'me', email: null, role: 'sales', permissions: ['templates.author'] };
  client.setQueryData(meQuery.queryKey, me);
  render(<QueryClientProvider client={client}><AuthorTemplatesPage /></QueryClientProvider>);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('AuthorTemplatesPage', () => {
  it('shows each status, Meta\'s reason, and «تعديل» only on the author\'s own editable ones', async () => {
    apiFetch.mockResolvedValue(ROWS);
    renderSignedIn();
    expect(await screen.findByText('offer_a')).toBeTruthy();
    expect(screen.getByText(S.status.pending)).toBeTruthy();
    expect(screen.getByText(S.status.rejected)).toBeTruthy();
    expect(screen.getByText(S.rejectedReason.replace('{reason}', 'INVALID_FORMAT'))).toBeTruthy();
    expect(screen.getAllByText(S.status.approved)).toHaveLength(4);
    expect(editFor('offer_a')).toBeNull();
    expect(editFor('offer_b')).toBeTruthy();
    expect(editFor('lesson_reminder')).toBeNull();
    expect(editFor('offer_c')).toBeTruthy();
    expect(editFor('offer_theirs')).toBeNull();
    expect(editFor('offer_seeded')).toBeNull();
    expect(screen.getByText(S.codeBound)).toBeTruthy();
  });

  it('«قالب جديد» picks MARKETING for an offer and sends it to the author route', async () => {
    apiFetch.mockResolvedValue([]);
    renderWithClient(<AuthorTemplatesPage />);
    fireEvent.click(screen.getByRole('button', { name: S.new }));
    fireEvent.change(screen.getByLabelText(t.templates.create.body), { target: { value: 'خصم خاص هذا الأسبوع' } });
    expect(screen.getByLabelText<HTMLSelectElement>(t.templates.create.category).value).toBe('marketing');
    apiSend.mockResolvedValue(template({ ...chat, key: 'tpl_x', status: 'pending' }));
    fireEvent.click(screen.getByRole('button', { name: S.submit }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messaging/templates/authored', expect.objectContaining({
      key: null, category: 'marketing', body: 'خصم خاص هذا الأسبوع', params: [], buttons: [],
    })));
  });
});
