import { counted } from '@ab/shared';
import { useMemo, useState } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { PageHead } from '@/components/ui/layout/page';
import { SearchInput } from '@/components/ui/form/search-input';
import { t } from '@/lib/i18n';
import { HUB_DESTINATIONS } from './hub-paths';
import { searchHub } from './hub-search';
import { HubResults } from './HubResults';
import { HubTable } from './HubTable';
import { useLegacySettingsRedirect } from './use-legacy-redirect';

const H = t.settingsHub;

/**
 * /admin/settings (R-MSG-01, docs/26b §1, hub.html): one search over every setting and module
 * page, then a five-row table of the destinations with their live state. A fragment, not <Page>:
 * the shell's PageFrame already frames it (like the module pages). An old `#…` link is sent
 * on to its new page first (docs/26 §4).
 */
export function SettingsHub() {
  const redirecting = useLegacySettingsRedirect();
  const [query, setQuery] = useState('');
  const hits = useMemo(() => searchHub(query), [query]);
  if (redirecting) return null;
  const searching = query.trim() !== '';
  return (
    <>
      <PageHead>
        <Cartouche>{t.settings.title}</Cartouche>
        <span className="text-sm text-ink-3 tabular-nums">{counted(H.sectionsCount, HUB_DESTINATIONS.length)}</span>
      </PageHead>
      <div role="search" className="mb-4 grid max-w-[560px] gap-1">
        <label className="sr-only" htmlFor="settings-hub-q">
          {t.config.search.label}
        </label>
        <SearchInput
          id="settings-hub-q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={H.placeholder}
          aria-describedby="settings-hub-q-hint"
          className="text-base sm:text-sm"
        />
        <p id="settings-hub-q-hint" className="text-xs text-ink-3 max-sm:sr-only">
          {H.searchHint}
        </p>
      </div>
      {searching ? <HubResults hits={hits} /> : <HubTable />}
    </>
  );
}
