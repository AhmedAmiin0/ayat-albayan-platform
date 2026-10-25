import type { AcademySettings, ConfigEntry, CustomConfigView, GoogleSyncSettings } from '@ab/shared';
import { useState } from 'react';
import { screen } from '@testing-library/react';
import type { Mock } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/testing/test-utils';
import { entriesFixture } from '@/test/entries-fixture';
import { SETTINGS } from '@/test/settings-fixture';
import type { ValuesSearch } from './values-search';
import { ValuesView } from './ValuesView';

// Shared by the «القيم» component tests (not app code). Each test file mocks '@/lib/api',
// '@/features/auth/use-permissions' and '@tanstack/react-router' (Link → inbox MockLink) itself.

export interface ValuesFixture {
  settings?: Partial<AcademySettings>;
  custom?: CustomConfigView[];
  google?: GoogleSyncSettings;
  search?: ValuesSearch;
  /** GET /settings never answers (loading) or fails (load error). */
  settingsState?: 'pending' | 'error';
  /** GET /config/custom fails. */
  customState?: 'error';
  /** GET /config/entries: these rows replace the seeded ones (version 1, no description). */
  entries?: ConfigEntry[];
}

/** The page with its search in local state (the route keeps it in the URL). */
function Harness({ initial, onSearch }: { initial: ValuesSearch; onSearch: (s: ValuesSearch) => void }) {
  const [search, setSearch] = useState(initial);
  return (
    <ValuesView
      search={search}
      onSearch={(next) => {
        onSearch(next);
        setSearch(next);
      }}
    />
  );
}

/** Renders «القيم» against routed apiFetch answers; returns the query client and the search log. */
export function renderValues(apiFetch: Mock, fx: ValuesFixture = {}) {
  const settings = { ...SETTINGS, ...fx.settings };
  routeFetch(apiFetch, [
    ['/settings/public', {}],
    ['/settings', settings],
    ['/config/meta', { meta: {} }],
    ['/config/entries', entriesFixture(fx.entries)],
    ['/config/custom', fx.custom ?? []],
    ['/admin/google/status', { settings: fx.google ?? { enabled: false, mode: 'dry_run', window_days: 60 } }],
  ]);
  const routed = apiFetch.getMockImplementation();
  if ((fx.settingsState || fx.customState) && routed) {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/config/custom' && fx.customState) throw new Error('down');
      if (path !== '/settings' || !fx.settingsState) return routed(path);
      if (fx.settingsState === 'pending') return new Promise(() => undefined);
      throw new Error('down');
    });
  }
  const searches: ValuesSearch[] = [];
  const client = renderWithClient(<Harness initial={fx.search ?? {}} onSearch={(s) => searches.push(s)} />);
  return { client, searches, settings };
}

/** The table row whose label (the row header's first line) is `label`. */
export async function findRow(label: string): Promise<HTMLElement> {
  const name = await screen.findByText(label, { selector: 'th span' });
  const row = name.closest('tr');
  if (!row) throw new Error(`no row for ${label}`);
  return row;
}

/** Is a row labelled `label` in the table now? */
export const hasRow = (label: string): boolean => screen.queryByText(label, { selector: 'th span' }) !== null;
