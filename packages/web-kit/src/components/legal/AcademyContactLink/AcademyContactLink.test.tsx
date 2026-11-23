import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@ab/web-kit/testing/query-render';
import { AcademyContactLink } from './AcademyContactLink';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const answer = (academy_contact: unknown) => apiFetch.mockResolvedValue({ academy_contact });
const FALLBACK = 'no contact';

afterEach(() => apiFetch.mockReset());

describe('AcademyContactLink: settings.academy_contact from GET /settings/public', () => {
  it('the email as a mailto link, LTR inside the RTL text', async () => {
    answer({ site: 'ayatalbayan.com', email: 'help@example.org' });
    renderWithClient(<AcademyContactLink fallback={FALLBACK} />);
    const link = await screen.findByRole('link', { name: 'help@example.org' });
    expect(link.getAttribute('href')).toBe('mailto:help@example.org');
    expect(link.getAttribute('dir')).toBe('ltr');
    expect(apiFetch).toHaveBeenCalledWith('/settings/public');
  });

  it('no email: the site, opened over https in a new tab', async () => {
    answer({ site: 'ayatalbayan.com' });
    renderWithClient(<AcademyContactLink fallback={FALLBACK} />);
    const link = await screen.findByRole('link', { name: 'ayatalbayan.com' });
    expect(link.getAttribute('href')).toBe('https://ayatalbayan.com');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('while loading or when the API fails: the built-in site (the registry default)', async () => {
    apiFetch.mockRejectedValue(new Error('offline'));
    const { client } = renderWithClient(<AcademyContactLink fallback={FALLBACK} />);
    expect(screen.getByRole('link', { name: 'ayatalbayan.com' })).toBeTruthy();
    const state = () => client.getQueryState(['settings', 'public'])?.status;
    await waitFor(() => expect(state()).toBe('error'));
    expect(screen.getByRole('link', { name: 'ayatalbayan.com' })).toBeTruthy();
  });

  it('nothing usable in the setting: the fallback text, no link', async () => {
    answer({ site: '' });
    renderWithClient(<AcademyContactLink fallback={FALLBACK} />);
    expect(await screen.findByText(FALLBACK)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
