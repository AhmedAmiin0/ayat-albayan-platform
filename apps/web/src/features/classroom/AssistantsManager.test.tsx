import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { AssistantsManager } from './AssistantsManager';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const NOUR = { profile_id: 'p-1', full_name: 'نور' };
const HALA = { profile_id: 'p-2', full_name: 'هالة' };

function open(assigned: unknown[], all: unknown[]) {
  apiFetch.mockImplementation((path: string) => Promise.resolve(path === '/assistants' ? all : assigned));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AssistantsManager studentId="s-1" />
    </QueryClientProvider>,
  );
}

describe('AssistantsManager', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('lists the assigned assistants and offers only the ones not yet assigned', async () => {
    open([NOUR], [NOUR, HALA]);
    expect(await screen.findByText('نور')).toBeTruthy();
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual([t.classroom.assistants.pick, 'هالة']);
  });

  it('says so when nobody is assigned', async () => {
    open([], [NOUR]);
    expect(await screen.findByText(t.classroom.assistants.none)).toBeTruthy();
  });

  it('adds the picked assistant and refreshes the list', async () => {
    open([], [NOUR]);
    await screen.findByRole('option', { name: 'نور' });
    const add = screen.getByRole('button', { name: t.classroom.assistants.add });
    expect(add).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText(t.classroom.assistants.pick), { target: { value: 'p-1' } });
    apiSend.mockResolvedValue([NOUR]);
    apiFetch.mockImplementation((path: string) => Promise.resolve(path === '/assistants' ? [NOUR] : [NOUR]));
    fireEvent.click(add);
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/students/s-1/assistants', { profileId: 'p-1' }));
    await waitFor(() => expect(screen.getByRole('button', { name: t.classroom.assistants.remove })).toBeTruthy());
  });

  it('removes one with «شيل»', async () => {
    open([NOUR], [NOUR]);
    apiSend.mockResolvedValue([]);
    fireEvent.click(await screen.findByRole('button', { name: t.classroom.assistants.remove }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/students/s-1/assistants/p-1', undefined));
  });

  it('says when every assistant is already assigned', async () => {
    open([NOUR], [NOUR]);
    expect(await screen.findByText(t.classroom.assistants.noneAvailable)).toBeTruthy();
  });
});
