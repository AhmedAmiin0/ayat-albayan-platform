import type { TranslationKeyRow } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { TranslationsPage } from './TranslationsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', () => ({ apiFetch, apiSend }));

const LEADS: TranslationKeyRow = { key: 'nav.leads', section: 'nav', ar: 'العملاء', en: 'Leads', arOverride: 'قائمة العملاء', enOverride: null };
const COUNT: TranslationKeyRow = { key: 'translations.count', section: 'translations', ar: 'عدد النصوص: {n}', en: 'Texts: {n}', arOverride: null, enOverride: null };

function renderPage(items: TranslationKeyRow[] = [LEADS, COUNT]) {
  apiFetch.mockResolvedValue({ items, total: items.length, page: 1, pageSize: 50, sections: ['nav', 'translations'] });
  apiSend.mockResolvedValue(undefined);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TranslationsPage />
    </QueryClientProvider>,
  );
}

const openRow = async (key: string) => fireEvent.click((await screen.findByText(key)).closest('tr') as HTMLElement);

afterEach(() => vi.resetAllMocks());

describe('TranslationsPage «الترجمات»', () => {
  it('lists key | العربية | English with the effective text and marks overrides', async () => {
    renderPage();
    const table = within(await screen.findByRole('table'));
    expect(table.getByText('قائمة العملاء')).toBeTruthy();
    expect(table.getAllByText(t.translations.overridden)).toHaveLength(1);
    expect(table.getByText('Texts: {n}')).toBeTruthy();
    expect(screen.getByText(t.translations.applyNote)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/i18n/keys?page=1&pageSize=50');
  });

  it('search and section go to the API and reset to page 1', async () => {
    renderPage();
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText(t.translations.search), { target: { value: 'leads' } });
    fireEvent.change(screen.getByLabelText(t.translations.section), { target: { value: 'nav' } });
    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith('/i18n/keys?page=1&pageSize=50&search=leads&section=nav'));
  });

  it('edits both languages side by side and saves only what changed', async () => {
    renderPage();
    await openRow('translations.count');
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText(t.translations.placeholderHint.replace('{tokens}', '{n}'))).toBeTruthy();
    fireEvent.change(dialog.getByLabelText(t.translations.english), { target: { value: 'Strings: {n}' } });
    fireEvent.click(dialog.getByRole('button', { name: t.translations.save }));
    await screen.findByText(t.translations.saved);
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(apiSend).toHaveBeenCalledWith('PUT', '/i18n/en/translations.count', { value: 'Strings: {n}' });
  });

  it('blocks a save that drops a placeholder', async () => {
    renderPage();
    await openRow('translations.count');
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText(t.translations.arabic), { target: { value: 'عدد النصوص' } });
    expect(dialog.getByText(t.translations.placeholdersMissing.replace('{tokens}', '{n}'))).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: t.translations.save }));
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('«استعادة الأصل» deletes the override of that language only', async () => {
    renderPage();
    await openRow('nav.leads');
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getAllByRole('button', { name: t.translations.restore })).toHaveLength(1);
    fireEvent.click(dialog.getByRole('button', { name: t.translations.restore }));
    await screen.findByText(t.translations.restored);
    expect(apiSend).toHaveBeenCalledWith('DELETE', '/i18n/ar/nav.leads');
  });
});
