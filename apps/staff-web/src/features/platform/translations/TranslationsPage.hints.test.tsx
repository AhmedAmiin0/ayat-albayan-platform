import { SEED_ENTRIES } from '@ab/settings';
import type { TranslationKeyRow } from '@ab/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { editedOnValues, registryHintOf, valuesHref } from './registry-hints';
import { isEditOnValues } from './TranslationEditor';
import { TranslationsPage } from './TranslationsPage';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', () => ({
  call: (request: unknown) => mockApi.call(request),
}));

const HINT_KEY = 'settings.hints.bookingHorizonWeeks';
const HINT: TranslationKeyRow = {
  key: HINT_KEY,
  section: 'settings',
  ar: 'نص عربي',
  en: 'English hint',
  arOverride: 'وصف المدير',
  enOverride: null,
};
const NAV: TranslationKeyRow = {
  key: 'nav.leads',
  section: 'nav',
  ar: 'العملاء',
  en: 'Leads',
  arOverride: null,
  enOverride: null,
};
const HREF = '/admin/settings/values?group=schedule&q=booking_horizon_weeks';

function renderPage() {
  mockApi.onRead(() => ({
    items: [HINT, NAV],
    total: 2,
    page: 1,
    pageSize: 50,
    sections: ['settings', 'nav'],
  }));
  mockApi.onWrite(() => undefined);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TranslationsPage />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.resetAllMocks());

describe('registry hint keys (docs/26 §3)', () => {
  it('are the SEED_ENTRIES hint keys; their Arabic only is edited on «القيم»', () => {
    expect(registryHintOf(HINT_KEY)).toEqual({
      settingKey: 'booking_horizon_weeks',
      group: 'schedule',
    });
    expect(registryHintOf('nav.leads')).toBeUndefined();
    // Owned keys (send gate, comms_source, Google): their Arabic hint stays editable here.
    for (const key of ['messaging_enabled', 'comms_source', 'google_sync_enabled']) {
      const hintKey = SEED_ENTRIES.find((e) => e.key === key)?.hintKey;
      if (hintKey) expect(editedOnValues(hintKey, 'ar')).toBe(false);
    }
    expect(editedOnValues(HINT_KEY, 'ar')).toBe(true);
    expect(editedOnValues(HINT_KEY, 'en')).toBe(false);
    expect(valuesHref({ settingKey: 'booking_horizon_weeks', group: 'schedule' })).toBe(HREF);
    expect(valuesHref({ settingKey: 'x_y', group: null })).toBe('/admin/settings/values?q=x_y');
  });

  it('409 edit_on_values is recognised', () => {
    expect(isEditOnValues({ status: 409, body: { code: 'edit_on_values', settingKey: 'k' } })).toBe(
      true,
    );
    expect(isEditOnValues({ status: 409, body: { code: 'other' } })).toBe(false);
    expect(isEditOnValues(new Error('x'))).toBe(false);
  });
});

describe('TranslationsPage — Arabic rows of registry hints', () => {
  it('the table links the Arabic of a hint key to «القيم»; other rows have no link', async () => {
    renderPage();
    const table = within(await screen.findByRole('table'));
    const links = table.getAllByRole('link', { name: t.translations.editOnValues });
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe(HREF);
  });

  it('the editor: Arabic read-only with the link and no restore; English still saves', async () => {
    renderPage();
    fireEvent.click((await screen.findByText(HINT_KEY)).closest('tr') as HTMLElement);
    const dialog = within(screen.getByRole('dialog'));
    const ar = dialog.getByLabelText<HTMLTextAreaElement>(t.translations.arabic);
    expect(ar.readOnly).toBe(true);
    expect(dialog.getByText(t.translations.arabicOnValues)).toBeTruthy();
    expect(
      dialog.getByRole('link', { name: t.translations.editOnValues }).getAttribute('href'),
    ).toBe(HREF);
    expect(dialog.queryByRole('button', { name: t.translations.restore })).toBeNull();
    fireEvent.change(ar, { target: { value: 'محاولة' } });
    fireEvent.change(dialog.getByLabelText(t.translations.english), {
      target: { value: 'Clearer hint' },
    });
    fireEvent.click(dialog.getByRole('button', { name: t.translations.save }));
    await waitFor(() => expect(mockApi.writes()).toHaveLength(1));
    expect(mockApi.writes()).toContainEqual({
      method: 'PUT',
      path: `/i18n/en/${HINT_KEY}`,
      body: { value: 'Clearer hint' },
    });
  });
});
