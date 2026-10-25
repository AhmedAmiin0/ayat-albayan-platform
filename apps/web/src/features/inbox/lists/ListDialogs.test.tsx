import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithClient } from '../test-utils';
import { CreateListDialog } from './CreateListDialog';
import { EditListDialog } from './EditListDialog';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend, apiFetch: vi.fn(async () => []) }));

const L = t.inbox.lists;
const LIST = { id: '0c000000-0000-4000-8000-000000000001', name: 'بانتظار الدفع', count: 3, auto_rule: null };
const name = () => screen.getByRole('textbox', { name: new RegExp(L.name) });
const type = (value: string) => fireEvent.change(name(), { target: { value } });

afterEach(() => apiSend.mockReset());

describe('CreateListDialog «قائمة جديدة»', () => {
  it('a blank name is refused before any request; a name is created trimmed and shown', async () => {
    apiSend.mockResolvedValue({ ...LIST, count: 0 });
    const onCreated = vi.fn();
    renderWithClient(<CreateListDialog onClose={vi.fn()} onCreated={onCreated} />);
    type('   ');
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    expect(await screen.findByText(t.common.required)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    type('  بانتظار الدفع ');
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ ...LIST, count: 0 }));
    expect(apiSend).toHaveBeenCalledWith('POST', '/chat-lists', { name: 'بانتظار الدفع' });
  });

  it.each([
    ['list_name_taken', L.nameTaken],
    ['list_limit', L.limit],
  ])('shows the server\'s %s inline under the name', async (code, text) => {
    apiSend.mockRejectedValue(new ApiError(409, { code, message: code }));
    renderWithClient(<CreateListDialog onClose={vi.fn()} onCreated={vi.fn()} />);
    type('بإنتظار الدفع');
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    expect(await screen.findByText(text)).toBeTruthy();
    expect(name().getAttribute('aria-invalid')).toBe('true');
  });
});

describe('EditListDialog «تعديل القائمة»', () => {
  it('renames with «حفظ» (PATCH) and closes', async () => {
    apiSend.mockResolvedValue({ ...LIST, name: 'مدفوع' });
    const onClose = vi.fn();
    renderWithClient(<EditListDialog list={LIST} onClose={onClose} onDeleted={vi.fn()} />);
    expect((name() as HTMLInputElement).value).toBe(LIST.name);
    type('مدفوع');
    fireEvent.click(screen.getByRole('button', { name: L.save }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/chat-lists/${LIST.id}`, { name: 'مدفوع' });
  });

  it('«حذف القائمة» asks first, says the chats stay, then deletes the list only', async () => {
    apiSend.mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    renderWithClient(<EditListDialog list={LIST} onClose={vi.fn()} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: L.delete }));
    expect(apiSend).not.toHaveBeenCalled();
    expect(screen.getByText(L.deleteConfirm.replace('{name}', LIST.name))).toBeTruthy();
    expect(screen.getByText(L.deleteNote)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: L.deleteYes }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith('DELETE', `/chat-lists/${LIST.id}`);
  });

  it('«إلغاء» in the confirm goes back to the name, nothing deleted', () => {
    renderWithClient(<EditListDialog list={LIST} onClose={vi.fn()} onDeleted={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: L.delete }));
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(name()).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
