import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '../testing/test-utils';
import { ThreadListsDialog } from './ThreadListsDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const L = t.inbox.lists;
const PHONE = '+966501234567';
const PAY = { id: '0c000000-0000-4000-8000-000000000001', name: 'بانتظار الدفع', count: 1 };
const TRIAL = { id: '0c000000-0000-4000-8000-000000000002', name: 'تجريبي', count: 0 };
const box = (n: string) => screen.findByRole<HTMLInputElement>('checkbox', { name: n });

function show(lists = [PAY, TRIAL]) {
  routeFetch(apiFetch, [['/chat-lists', lists]]);
  renderWithClient(<ThreadListsDialog phone={PHONE} lists={[{ id: PAY.id, name: PAY.name }]} onClose={vi.fn()} />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('ThreadListsDialog «القوائم» of one chat (docs/22 §4)', () => {
  it('checks the lists the chat is in; a toggle shows and saves at once (PUT in, DELETE out)', async () => {
    const answers: (() => void)[] = [];
    apiSend.mockImplementation(() => new Promise<void>((r) => answers.push(r)));
    show();
    expect((await box(PAY.name)).checked).toBe(true);
    expect((await box(TRIAL.name)).checked).toBe(false);
    fireEvent.click(await box(TRIAL.name));
    expect((await box(TRIAL.name)).checked).toBe(true);
    fireEvent.click(await box(PAY.name));
    expect((await box(PAY.name)).checked).toBe(false);
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(2));
    expect(apiSend).toHaveBeenCalledWith('PUT', `/chat-lists/${TRIAL.id}/threads/%2B966501234567`);
    expect(apiSend).toHaveBeenCalledWith('DELETE', `/chat-lists/${PAY.id}/threads/%2B966501234567`);
    await act(async () => answers.forEach((a) => a()));
  });

  it('a failed save puts the box back and says so', async () => {
    let fail: (e: unknown) => void = () => undefined;
    apiSend.mockReturnValue(new Promise((_r, reject) => (fail = reject)));
    show();
    fireEvent.click(await box(TRIAL.name));
    expect((await box(TRIAL.name)).checked).toBe(true);
    fail(new ApiError(500));
    await waitFor(async () => expect((await box(TRIAL.name)).checked).toBe(false));
    expect(await screen.findByText(L.saveError)).toBeTruthy();
  });

  it('«قائمة جديدة» creates a list and adds the chat to it in one go', async () => {
    const NEW = { id: '0c000000-0000-4000-8000-000000000003', name: 'متابعة', count: 0 };
    apiSend.mockImplementation(async (method: string) => (method === 'POST' ? NEW : undefined));
    show();
    fireEvent.click(await screen.findByRole('button', { name: L.new }));
    fireEvent.change(screen.getByRole('textbox', { name: new RegExp(L.name) }), { target: { value: 'متابعة' } });
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', `/chat-lists/${NEW.id}/threads/%2B966501234567`));
    expect(apiSend).toHaveBeenCalledWith('POST', '/chat-lists', { name: 'متابعة' });
  });

  it('no list yet: says so and still offers «قائمة جديدة»', async () => {
    show([]);
    expect(await screen.findByText(L.none)).toBeTruthy();
    expect(screen.getByRole('button', { name: L.new })).toBeTruthy();
  });
});
