import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { formatPhone } from '@ab/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { renderWithClient } from '@ab/web-kit/testing/query-render';
import { linkDetail, USER_ID } from '@/features/platform/short-links/shared/short-links.fixtures';
import { CreateLinkDialog } from './CreateLinkDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch,
  apiSend,
}));

const F = t.shortLinks.form;
const E = F.errors;

function open() {
  const onCreated = vi.fn();
  renderWithClient(<CreateLinkDialog onClose={vi.fn()} onCreated={onCreated} />);
  return onCreated;
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });

function fillValid() {
  type(F.titleLabel, 'لقاء الأسر');
  type(F.target, 'https://meet.google.com/kdw-pqhr-xab');
}

const submit = (name = F.create) => fireEvent.click(screen.getByRole('button', { name }));

/** jsdom has no scrollIntoView: a refused submit scrolls to its first wrong field. */
const scroll = vi.fn();
beforeEach(() => {
  Element.prototype.scrollIntoView = scroll;
});
afterEach(() => {
  vi.clearAllMocks();
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

describe('CreateLinkDialog', () => {
  it('checks the form before sending: title and target', async () => {
    open();
    submit();
    expect(await screen.findByText(E.title_invalid)).toBeTruthy();
    expect(screen.getByText(E.target_invalid)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a refused submit scrolls to the first wrong field and focuses it', async () => {
    open();
    type(F.titleLabel, 'لقاء الأسر');
    submit();
    const target = screen.getByLabelText(new RegExp(`^${F.target}`));
    await waitFor(() => expect(document.activeElement).toBe(target));
    expect(target.getAttribute('aria-invalid')).toBe('true');
    expect(scroll).toHaveBeenCalledWith({ block: 'center' });
  });

  it('defaults to 7 days, anyone, unlimited; a created link hands its code on', async () => {
    apiSend.mockResolvedValue({ ...linkDetail(), send: null });
    const onCreated = open();
    const week = screen.getByRole('radio', { name: F.days.few.replace('{n}', '7') });
    expect(week).toHaveProperty('checked', true);
    fillValid();
    submit();
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('K7q2M9xT'));
    const [method, path, body] = apiSend.mock.calls[0] ?? [];
    expect([method, path]).toEqual(['POST', '/short-links']);
    expect(body).toMatchObject({ audience: 'anyone', maxUsers: null, sendWhatsapp: false });
  });

  it("shows the API's allow-list refusal on the target", async () => {
    apiSend.mockRejectedValue(new ApiError(400, { code: 'target_not_allowed' }));
    open();
    fillValid();
    submit();
    expect(await screen.findByText(E.target_not_allowed)).toBeTruthy();
  });

  it('listed people: picked from the search, sent by WhatsApp', async () => {
    apiFetch.mockResolvedValue([{ id: USER_ID, name: 'مريم خالد', role: 'student', phone: null }]);
    apiSend.mockResolvedValue({ ...linkDetail(), send: { queued: 0, failed: 1 } });
    const onCreated = open();
    fillValid();
    fireEvent.click(screen.getByRole('radio', { name: t.shortLinks.audience.listed }));
    submit();
    expect(await screen.findByText(E.users_required)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(F.addPeople), { target: { value: 'مريم' } });
    const match = (await screen.findByText('مريم خالد')).closest('li') as HTMLElement;
    fireEvent.click(within(match).getByRole('button', { name: F.add }));
    expect(within(match).getByRole('button', { name: t.shortLinks.people.picked })).toBeTruthy();
    const results = screen.getByRole('list', { name: t.shortLinks.people.results });
    expect(within(results).getByText('مريم خالد')).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: F.sendWhatsapp }));
    submit(F.createAndSend);
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(apiSend.mock.calls[0]?.[2]).toMatchObject({
      audience: 'listed',
      profileIds: [USER_ID],
      sendWhatsapp: true,
    });
  });

  it('a free number: checked, listed as not on the platform', () => {
    open();
    fireEvent.click(screen.getByRole('radio', { name: t.shortLinks.audience.listed }));
    type(F.addPhone, '+20 112 000 0003');
    fireEvent.click(screen.getAllByRole('button', { name: F.add }).at(-1) as HTMLElement);
    expect(screen.getByText(formatPhone('+201120000003'))).toBeTruthy();
    expect(screen.getByText(F.unregistered)).toBeTruthy();
  });

  it('a wrong free number says so for that one number', () => {
    open();
    fireEvent.click(screen.getByRole('radio', { name: t.shortLinks.audience.listed }));
    type(F.addPhone, '12');
    fireEvent.click(screen.getAllByRole('button', { name: F.add }).at(-1) as HTMLElement);
    expect(screen.getByText(t.shortLinks.gate.errors.invalid_phone)).toBeTruthy();
    expect(screen.queryByText(F.errors.phone_invalid)).toBeNull();
  });
});
