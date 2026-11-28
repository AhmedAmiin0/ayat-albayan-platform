import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { lead } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { QuickActions } from './QuickActions';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));
const granted = vi.hoisted(() => new Set<string>());
vi.mock('@ab/web-kit/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }),
}));

const L = t.inbox.linkFamily;
const MATCH = { name: 'سهيلة', code: 'AB-0183', status: 'active', teacher_name: null };

describe('«ربط بطالب موجود» in the admin inbox lead panel (owner 2026-10-29)', () => {
  beforeEach(() => {
    mockApi.reset('read');
    mockApi.reset('write');
    granted.clear();
    granted.add('leads.link_family');
    granted.add('students.check_registration');
  });

  // The picker searches with GET /sales/registration-check, so both keys are needed.
  it.each(['leads.link_family', 'students.check_registration'])('is hidden without %s', (key) => {
    granted.delete(key);
    renderWithClient(<QuickActions lead={lead()} onDone={vi.fn()} />);
    expect(screen.getByRole('link', { name: t.booking.trialTitle })).toBeTruthy();
    expect(screen.queryByRole('button', { name: L.action })).toBeNull();
  });

  it('shows on a converted lead too, links its id and reports the text up (the panel goes with the lead)', async () => {
    mockApi.onRead(() => ({ found: true, more: false, matches: [MATCH] }));
    mockApi.onWrite(() => ({ linked: false }));
    const onDone = vi.fn();
    renderWithClient(
      <QuickActions lead={lead({ id: 'lead-9', status: 'converted' })} onDone={onDone} />,
    );
    fireEvent.click(screen.getByRole('button', { name: L.action }));
    const dialog = within(screen.getByRole('dialog', { name: L.title }));
    fireEvent.change(dialog.getByLabelText(t.registrationCheck.query), {
      target: { value: 'سهيلة' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.common.search }));
    fireEvent.click(await dialog.findByRole('button', { name: /AB-0183/ }));
    fireEvent.click(screen.getByRole('button', { name: L.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(L.already));
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/leads/lead-9/link-family',
      body: { code: 'AB-0183' },
    });
    expect(screen.queryByRole('dialog', { name: L.title })).toBeNull();
  });
});
