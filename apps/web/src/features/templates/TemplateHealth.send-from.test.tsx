import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { numberView } from '@/features/numbers/numbers.fixture';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { LINES } from './template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

// «يُرسل من» with templates.manage (docs/23c decision 9): pick → confirm → PUT …/number.

const s = t.templates.sendFrom;
const NAME = t.templates.names.booking_confirmation_plain;
const SPARE = numberView({ id: 'num-2', label: 'Spare line', is_default: false, fallback_rank: 5 });
const BOOKING = template({ number_id: null, numbers: [] });

async function renderPick() {
  routeFetch(apiFetch, [
    ['/admin/numbers', [numberView(), SPARE]],
    ['/messaging/templates/lines', LINES],
    ['/messaging/templates', [BOOKING]],
  ]);
  renderWithClient(<TemplateHealth headingId="h" />);
  const select = await screen.findByRole('combobox', { name: s.labelFor.replace('{name}', NAME) });
  await within(select).findByRole('option', { name: s.option.replace('{label}', 'Spare line').replace('{role}', t.numbers.purpose.notifications) });
  return select;
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('template health — «يُرسل من»', () => {
  it('offers the role default first, then each number by label', async () => {
    const select = await renderPick();
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      s.roleDefault,
      s.option.replace('{label}', 'Notifications line').replace('{role}', t.numbers.purpose.notifications),
      s.option.replace('{label}', 'Spare line').replace('{role}', t.numbers.purpose.notifications),
    ]);
    expect((select as HTMLSelectElement).value).toBe('');
  });

  it('a pick asks first (approval on that WABA or the next number), then PUTs; not approved there warns', async () => {
    const select = await renderPick();
    fireEvent.change(select, { target: { value: 'num-2' } });
    const dialog = screen.getByRole('dialog', { name: s.confirmTitle });
    expect(dialog.textContent).toContain(s.confirmText.replace('{name}', NAME).replace('{number}', 'Spare line'));
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue({ template: { ...BOOKING, number_id: 'num-2' }, not_approved_on_number: true });
    fireEvent.click(within(dialog).getByRole('button', { name: s.confirmYes }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/messaging/templates/booking_confirmation_plain/number', { number_id: 'num-2' }),
    );
    expect(await screen.findByText(s.notApproved)).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('cancel sends nothing; back to the default PUTs null; a 404 is said in words', async () => {
    const select = await renderPick();
    fireEvent.change(select, { target: { value: 'num-2' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(apiSend).not.toHaveBeenCalled();

    fireEvent.change(select, { target: { value: '' } });
    const dialog = screen.getByRole('dialog', { name: s.confirmTitle });
    expect(dialog.textContent).toContain(s.confirmDefault.replace('{name}', NAME));
    apiSend.mockRejectedValue(new ApiError(404, { code: 'unknown_number' }));
    fireEvent.click(within(dialog).getByRole('button', { name: s.confirmYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', expect.stringContaining('/number'), { number_id: null }));
    expect(await screen.findByText(t.templates.error.unknown_number)).toBeTruthy();
  });
});
