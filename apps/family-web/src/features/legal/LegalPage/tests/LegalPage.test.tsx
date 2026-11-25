import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { LegalPage } from '@/features/legal/LegalPage/LegalPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const L = t.legal;
const contact = { site: 'ayatalbayan.com', email: 'help@example.org' };

afterEach(() => {
  apiFetch.mockReset();
});

describe('«سياسة الخصوصية»', () => {
  it('one title, the date, the intro and every section heading', async () => {
    apiFetch.mockResolvedValue({ academy_contact: contact });
    renderAt(<LegalPage page="privacy" />, '/privacy');
    expect(await screen.findByRole('heading', { level: 1, name: L.privacy.title })).toBeTruthy();
    expect(screen.getByText(L.updated.replace('{date}', '2026-11-21'))).toBeTruthy();
    expect(screen.getByText(L.privacy.intro)).toBeTruthy();
    const titles = Object.values(L.privacy.sections).map((s) => s.title);
    const shown = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(shown).toEqual(titles);
  });

  it('children, no ads and no advertising ID are stated', async () => {
    apiFetch.mockResolvedValue({ academy_contact: contact });
    renderAt(<LegalPage page="privacy" />, '/privacy');
    const kids = await screen.findByRole('region', { name: L.privacy.sections.children.title });
    expect(within(kids).getByText(L.privacy.sections.children.items.noAds)).toBeTruthy();
  });

  it('the contact section links the academy email from the settings', async () => {
    apiFetch.mockResolvedValue({ academy_contact: contact });
    renderAt(<LegalPage page="privacy" />, '/privacy');
    const box = await screen.findByRole('region', { name: L.privacy.sections.contact.title });
    const link = await within(box).findByRole('link', { name: contact.email });
    expect(link.getAttribute('href')).toBe(`mailto:${contact.email}`);
  });

  it('the footer links the deletion page and sign-in, not itself', async () => {
    apiFetch.mockResolvedValue({ academy_contact: contact });
    renderAt(<LegalPage page="privacy" />, '/privacy');
    const footer = await screen.findByRole('contentinfo');
    const del = within(footer).getByRole('link', { name: L.links.deleteAccount });
    expect(del.getAttribute('href')).toBe('/delete-account');
    expect(within(footer).getByRole('link', { name: L.links.signIn }).getAttribute('href')).toBe(
      '/login',
    );
    expect(within(footer).queryByRole('link', { name: L.links.privacy })).toBeNull();
  });
});

describe('«حذف الحساب وبياناته»', () => {
  it('numbered steps, what is deleted and kept, the time, the contact', async () => {
    apiFetch.mockResolvedValue({ academy_contact: { site: 'ayatalbayan.com' } });
    renderAt(<LegalPage page="deleteAccount" />, '/delete-account');
    const steps = await screen.findByRole('region', { name: L.deletion.sections.steps.title });
    expect(within(steps).getByRole('list').tagName).toBe('OL');
    expect(within(steps).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText(L.deletion.sections.kept.items.payments)).toBeTruthy();
    expect(screen.getByText(L.deletion.sections.timing.body)).toBeTruthy();
    const box = screen.getByRole('region', { name: L.deletion.sections.contact.title });
    expect(await within(box).findByRole('link', { name: 'ayatalbayan.com' })).toBeTruthy();
  });

  it('no usable contact in the settings: the WhatsApp fallback line, no link', async () => {
    apiFetch.mockResolvedValue({ academy_contact: { site: '' } });
    renderAt(<LegalPage page="deleteAccount" />, '/delete-account');
    const box = await screen.findByRole('region', { name: L.deletion.sections.contact.title });
    expect(await within(box).findByText(L.contactFallback)).toBeTruthy();
    expect(within(box).queryByRole('link')).toBeNull();
  });

  it('the footer links the privacy policy back', async () => {
    apiFetch.mockResolvedValue({ academy_contact: contact });
    renderAt(<LegalPage page="deleteAccount" />, '/delete-account');
    const footer = await screen.findByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: L.links.privacy })).toBeTruthy();
  });
});
