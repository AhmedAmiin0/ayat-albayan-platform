import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { SettingsSearch } from '@/components/settings/SettingsSearch';
import { SettingsViewContext } from '@/components/settings/settings-view';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { settingsQuery } from '@/lib/settings-api';
import { SettingsBody } from './SettingsBody';
import { settingsMetaQuery } from './settings-meta-api';
import { SettingsNav } from './SettingsNav';

/**
 * /admin/settings (owner, 2026-10-05 «enhance the view of the settings»): the settings grouped into
 * sections with an index beside them (a chip row on phones), as the settings registry orders them
 * («add dynamic configurations»: every field comes from the registry, by type). Each setting is a
 * row with a dirty mark, a reset-to-default and who changed it last; a search box filters every
 * setting; the messaging switches keep their own confirmation; «قيم مخصصة» holds free-form entries.
 * The sections, their order and what the search finds in each are PAGE_SECTIONS (page-sections.tsx).
 */
export function SettingsPage() {
  const settings = useQuery(settingsQuery);
  const metaQuery = useQuery(settingsMetaQuery);
  const [note, setNote] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  return (
    <SettingsViewContext.Provider value={{ query, meta: metaQuery.data ?? {} }}>
      <PageHead>
        <Cartouche>{t.settings.title}</Cartouche>
      </PageHead>
      {settings.isError && <FormAlert>{t.common.error}</FormAlert>}
      {settings.isPending && <ListSkeleton rows={6} />}
      {/* minmax(0,1fr): a wide table scrolls inside its own box instead of widening the page (768px). */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 shell:grid-cols-[200px_minmax(0,1fr)] shell:gap-10">
        <SettingsNav className="shell:sticky shell:top-20 shell:self-start" />
        {settings.data && (
          <div className="grid min-w-0 gap-6">
            <SettingsSearch value={query} onChange={setQuery} />
            <SettingsBody settings={settings.data} query={query} onSaved={() => setNote(t.settings.saved)} onNote={setNote} />
          </div>
        )}
      </div>
      {note && <Toast message={note} onDismiss={() => setNote(null)} />}
    </SettingsViewContext.Provider>
  );
}
