import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { numberView } from '@/features/messaging/numbers/numbers.fixture';
import { t } from '@/lib/i18n/i18n';
import { LINES } from './lines/template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

// «يُرسل من» while the save is in flight: the dialog can't be dismissed and the selects wait.

const s = t.templates.sendFrom;
const NAME = t.templates.names.booking_confirmation_plain;
const SPARE = numberView({ id: 'num-2', label: 'Spare line', is_default: false, fallback_rank: 5 });
const BOOKING = template({ number_id: null, numbers: [] });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('template health — «يُرسل من» busy', () => {
  it('Cancel, Escape and the select wait until the save settles; a not-approved save is an info toast', async () => {
    routeFetch(apiFetch, [
      ['/admin/numbers', [numberView(), SPARE]],
      ['/messaging/templates/lines', LINES],
      ['/messaging/templates', [BOOKING]],
    ]);
    renderWithClient(<TemplateHealth headingId="h" />);
    const box = () => screen.getByRole('combobox', { name: s.labelFor.replace('{name}', NAME) }) as HTMLSelectElement;
    const select = await screen.findByRole('combobox', { name: s.labelFor.replace('{name}', NAME) });
    await within(select).findByRole('option', { name: s.option.replace('{label}', 'Spare line').replace('{role}', t.numbers.purpose.notifications) });
    fireEvent.change(select, { target: { value: 'num-2' } });
    const dialog = screen.getByRole('dialog', { name: s.confirmTitle });
    let settle: (v: unknown) => void = () => undefined;
    apiSend.mockReturnValue(new Promise((done) => (settle = done)));
    fireEvent.click(within(dialog).getByRole('button', { name: s.confirmYes }));
    await waitFor(() => expect(box().disabled).toBe(true));
    const cancel = within(dialog).getByRole('button', { name: t.common.cancel }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: s.confirmTitle })).toBeTruthy();

    settle({ template: { ...BOOKING, number_id: 'num-2' }, not_approved_on_number: true });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const toast = await screen.findByText(s.notApproved);
    expect(toast.closest('[role="status"]')?.className).not.toContain('bg-danger-soft');
    expect(box().disabled).toBe(false);
  });
});
