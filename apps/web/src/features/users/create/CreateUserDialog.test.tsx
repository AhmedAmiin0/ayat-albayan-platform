import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { CreateUserDialog } from './CreateUserDialog';
import { CANDIDATES, fakeApi, renderWithClient } from '../users-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const F = t.users.form;
const dialog = () => screen.getByRole('dialog', { name: t.users.create.title });
const field = (label: string) => within(dialog()).getByLabelText(new RegExp(`^${label}`));
const submit = () => fireEvent.click(within(dialog()).getByRole('button', { name: t.users.create.submit }));

function fillBasics(email = 'new@ab.co') {
  fireEvent.change(field(F.fullName), { target: { value: 'منى خالد' } });
  fireEvent.change(field(F.email), { target: { value: email } });
}

describe('CreateUserDialog', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(fakeApi());
    apiSend.mockReset();
  });

  it('checks the fields before any request', async () => {
    renderWithClient(<CreateUserDialog onClose={() => undefined} />);
    submit();
    expect(await screen.findByText(t.users.validation.email)).toBeTruthy();
    expect(screen.getByText(t.users.validation.name)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a student login needs a linked record', async () => {
    renderWithClient(<CreateUserDialog onClose={() => undefined} />);
    fillBasics();
    fireEvent.change(within(dialog()).getByLabelText(F.role), { target: { value: 'student' } });
    submit();
    expect(await screen.findByText(t.users.validation.linkRequired)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('finds a student by code, links it and sends linked_id', async () => {
    apiSend.mockResolvedValue({ user: {}, credential: { kind: 'password', value: 'Gen-Pass-123' } });
    renderWithClient(<CreateUserDialog onClose={() => undefined} />);
    fillBasics();
    fireEvent.change(within(dialog()).getByLabelText(F.role), { target: { value: 'student' } });
    fireEvent.change(await screen.findByPlaceholderText(t.users.link.placeholder), { target: { value: 'AB-0007' } });
    await waitFor(() => expect(screen.queryByRole('button', { name: /AB-0008/ })).toBeNull());
    fireEvent.click(await screen.findByRole('button', { name: /AB-0007/ }));
    submit();
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    expect(apiSend.mock.calls[0]).toEqual(['POST', '/users', expect.objectContaining({ role: 'student', linked_id: CANDIDATES[0]?.id, email: 'new@ab.co' })]);
  });

  it('shows the generated password once, then it is gone after closing', async () => {
    apiSend.mockResolvedValue({ user: {}, credential: { kind: 'password', value: 'Gen-Pass-123' } });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    let open = true;
    const view = renderWithClient(<CreateUserDialog onClose={() => (open = false)} />);
    fillBasics();
    submit();
    expect(await screen.findByTestId('issued-credential')).toHaveProperty('textContent', 'Gen-Pass-123');
    expect(screen.getByText(t.users.result.once)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.users.result.copy }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Gen-Pass-123'));
    expect(await screen.findByRole('button', { name: t.users.result.copied })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.users.result.close }));
    expect(open).toBe(false);
    view.unmount();
    expect(document.body.textContent).not.toContain('Gen-Pass-123');
    expect(JSON.stringify(view.client.getQueryCache().getAll().map((q) => q.state.data))).not.toContain('Gen-Pass-123');
  });

  it('a typed password is sent and not shown back', async () => {
    apiSend.mockResolvedValue({ user: {}, credential: null });
    renderWithClient(<CreateUserDialog onClose={() => undefined} />);
    fillBasics();
    fireEvent.click(within(dialog()).getByRole('radio', { name: t.users.credential.set }));
    fireEvent.change(field(t.users.credential.password), { target: { value: 'Typed-pass-1' } });
    submit();
    expect(await screen.findByText(t.users.result.setDone)).toBeTruthy();
    expect(apiSend.mock.calls[0]?.[2]).toMatchObject({ credential: 'set', password: 'Typed-pass-1' });
  });

  it('only offers custom roles of the base role, disabling those the actor cannot grant', async () => {
    renderWithClient(<CreateUserDialog onClose={() => undefined} />);
    const select = await within(dialog()).findByLabelText(F.customRole);
    const names = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(names).toEqual([F.defaultRole, 'محاسب', F.notAssignable.replace('{name}', 'سري')]);
    const secret = within(select).getByRole('option', { name: /سري/ });
    expect(secret).toHaveProperty('disabled', true);
  });

  it('a teacher can be created new, with its own names', async () => {
    apiSend.mockResolvedValue({ user: {}, credential: null });
    renderWithClient(<CreateUserDialog onClose={() => undefined} />);
    fillBasics();
    fireEvent.change(within(dialog()).getByLabelText(F.role), { target: { value: 'teacher' } });
    fireEvent.click(within(dialog()).getByRole('radio', { name: t.users.link.newTeacher }));
    fireEvent.change(field(t.users.newTeacher.nameAr), { target: { value: 'أبرار' } });
    submit();
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    const body = apiSend.mock.calls[0]?.[2];
    expect(body).toMatchObject({ role: 'teacher', new_teacher: { display_name_ar: 'أبرار', gender: 'female' } });
    expect(body).not.toHaveProperty('linked_id');
  });

  it('maps API errors to messages', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'email_taken', message: 'email_taken' }));
    renderWithClient(<CreateUserDialog onClose={() => undefined} />);
    fillBasics();
    submit();
    expect(await screen.findByText(t.users.errors.email_taken)).toBeTruthy();
  });

  it('prefill links the student and fixes the role', async () => {
    apiSend.mockResolvedValue({ user: {}, credential: { kind: 'link', value: 'https://x.test/invite' } });
    const linked = CANDIDATES[0];
    if (!linked) throw new Error('fixture');
    renderWithClient(<CreateUserDialog onClose={() => undefined} prefill={{ role: 'student', linked }} />);
    expect(field(F.fullName)).toHaveProperty('value', 'يوسف علي');
    expect(within(dialog()).queryByRole('button', { name: t.users.link.change })).toBeNull();
    expect(within(dialog()).getByLabelText(F.role)).toHaveProperty('disabled', true);
    fireEvent.change(field(F.email), { target: { value: 'y@ab.co' } });
    fireEvent.click(within(dialog()).getByRole('radio', { name: t.users.credential.link }));
    submit();
    expect(await screen.findByText(t.users.result.link)).toBeTruthy();
    expect(apiSend.mock.calls[0]?.[2]).toMatchObject({ role: 'student', linked_id: linked.id, credential: 'link' });
  });
});
