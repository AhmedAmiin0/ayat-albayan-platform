import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ASSISTANT } from './fixtures';
import { TermsEditor } from './TermsEditor';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));

const T = t.assistants.terms;
const empty = { ...ASSISTANT, terms: { assistant_id: 'a1', salary: null, commission: null } };

function renderEditor(assistant = ASSISTANT) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TermsEditor assistant={assistant} />
    </QueryClientProvider>,
  );
}
const save = () => fireEvent.click(screen.getByRole('button', { name: T.save }));

describe('TermsEditor (R-ASST-02, R-ASST-03, R-ASST-05)', () => {
  beforeEach(() => {
    apiSend.mockReset();
    apiSend.mockResolvedValue(ASSISTANT.terms);
  });

  it('loads the saved terms and saves them unchanged to PUT /assistant-pay/terms/:id', async () => {
    renderEditor();
    expect((screen.getByLabelText(T.salaryAmount) as HTMLInputElement).value).toBe('3000');
    expect((screen.getByLabelText(T.valuePercent) as HTMLInputElement).value).toBe('10');
    save();
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/assistant-pay/terms/a1', {
        salary: { amount: 3000, currency: 'EGP', startsOn: '2026-10-01' },
        commission: { type: 'percent', value: 10, currency: null, startsOn: '2026-10-01' },
      }),
    );
    expect(await screen.findByText(T.saved)).toBeTruthy();
  });

  it('a percent over 100 stops at the field and nothing is sent', async () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText(T.valuePercent), { target: { value: '150' } });
    save();
    expect(await screen.findByText(t.assistants.error.percent_max_100)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a fixed commission asks for its currency; a percent has none', () => {
    renderEditor(empty);
    expect(screen.queryByLabelText(T.valuePercent)).toBeNull();
    fireEvent.change(screen.getByLabelText(T.commissionType), { target: { value: 'percent' } });
    expect(screen.queryByLabelText(T.commissionCurrency)).toBeNull();
    fireEvent.change(screen.getByLabelText(T.commissionType), { target: { value: 'fixed' } });
    expect(screen.getByLabelText(T.commissionCurrency)).toBeTruthy();
    expect(screen.getByLabelText(T.valueFixed)).toBeTruthy();
  });

  it('a fixed commission goes with its own currency, the salary stays empty (cleared)', async () => {
    renderEditor(empty);
    fireEvent.change(screen.getByLabelText(T.commissionType), { target: { value: 'fixed' } });
    fireEvent.change(screen.getByLabelText(T.valueFixed), { target: { value: '25.5' } });
    fireEvent.change(screen.getByLabelText(T.commissionCurrency), { target: { value: 'SAR' } });
    save();
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/assistant-pay/terms/a1', {
        salary: null,
        commission: { type: 'fixed', value: 25.5, currency: 'SAR', startsOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
      }),
    );
  });

  it('a saved start day cannot move earlier, and a new part cannot start in the past: stops at the field, nothing is sent', async () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText(T.salaryStartsOn), { target: { value: '2026-09-01' } });
    save();
    expect(await screen.findByText(t.assistants.error.salary_start_earlier)).toBeTruthy();
    expect((screen.getByLabelText(T.salaryStartsOn) as HTMLInputElement).min).toBe('2026-10-01'); // the saved day
    fireEvent.change(screen.getByLabelText(T.salaryStartsOn), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText(T.commissionStartsOn), { target: { value: '2026-10-02' } }); // later is fine
    save();
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    expect(apiSend.mock.calls[0]?.[2]).toMatchObject({ commission: { startsOn: '2026-10-02' } });
  });

  it('the API refuses a start day: its code is shown in Arabic', async () => {
    apiSend.mockRejectedValue(new ApiError(400, { code: 'commission_start_in_past' }));
    renderEditor();
    save();
    expect(await screen.findByText(t.assistants.error.commission_start_in_past)).toBeTruthy();
  });

  it('an API error code is shown in Arabic', async () => {
    apiSend.mockRejectedValue(new ApiError(400, { code: 'assistant_not_found' }));
    renderEditor();
    save();
    expect(await screen.findByText(t.assistants.error.assistant_not_found)).toBeTruthy();
  });
});
