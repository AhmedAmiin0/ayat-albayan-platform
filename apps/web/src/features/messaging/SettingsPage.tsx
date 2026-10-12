import { SETTING_KEYS, type AcademySettings } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { configMetaQuery } from '../config/config-api';
import { customConfigQuery } from '../config/custom-api';
import { matchesCustom } from '../config/custom-form';
import { CustomValuesPanel } from '../config/CustomValuesPanel';
import { matchesSetting, matchesText } from '../config/settings-search';
import { SettingsSearch } from '../config/SettingsSearch';
import { SettingsViewContext } from '../config/settings-view';
import { integrationsMatch } from '../integrations/integrations-form';
import { IntegrationsPanel } from '../integrations/IntegrationsPanel';
import { settingsQuery } from './api';
import { SettingsNav, type ExtraSection } from './SettingsNav';
import { AppearanceSection, FieldsSection, MessagingSection, SalesSection } from './SettingsSections';
import { useSettingsForm } from './use-settings-form';

/** The sections made only of registry fields, in page order between messaging and sales. */
const FIELD_SECTIONS = ['schedule', 'classroom', 'reports', 'accounts', 'uploads', 'academy'] as const;
const EXTRA_NAV: readonly ExtraSection[] = [
  { id: 'integrations', label: t.integrations.title },
  { id: 'custom', label: t.config.sections.custom },
];

interface BodyProps {
  settings: AcademySettings;
  query: string;
  onSaved: () => void;
  onNote: (message: string) => void;
}

/** Does the search match nothing on the page: no setting, no theme row, no custom entry? */
function useNothingMatches(query: string): boolean {
  const custom = useQuery(customConfigQuery);
  if (query.trim() === '') return false;
  return (
    !SETTING_KEYS.some((k) => matchesSetting(k, query)) &&
    !matchesText(`${t.settings.theme} ${t.settings.themeHint}`, query) &&
    !integrationsMatch(query) &&
    !(custom.data ?? []).some((e) => matchesCustom(e, query))
  );
}

/** The sections in page order, with one «حفظ» bar for every field (the switches save on their own). */
function SettingsBody({ settings, query, onSaved, onNote }: BodyProps) {
  const state = useSettingsForm(settings, onSaved);
  const none = useNothingMatches(query);
  return (
    <div className="grid min-w-0 gap-10">
      {none && <p className="text-sm text-ink-3">{t.config.search.none}</p>}
      <MessagingSection settings={settings} state={state} />
      {FIELD_SECTIONS.map((id) => (
        <FieldsSection key={id} id={id} state={state} />
      ))}
      <SalesSection settings={settings} />
      <AppearanceSection />
      <IntegrationsPanel query={query} onSaved={onNote} />
      <CustomValuesPanel query={query} onSaved={onNote} />
      <div className="sticky bottom-0 z-10 grid gap-2 border-t border-rule bg-page py-3">
        {state.failed && <FormAlert>{t.common.error}</FormAlert>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-3">{t.settings.saveBar}</p>
          <Button type="button" disabled={state.saving} onClick={state.submit}>
            {state.saving ? t.common.saving : t.common.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * /admin/settings (owner, 2026-10-05 «enhance the view of the settings»): the settings grouped into
 * sections with an index beside them (a chip row on phones), as the settings registry orders them
 * («add dynamic configurations»: every field comes from the registry, by type). Each setting is a
 * row with a dirty mark, a reset-to-default and who changed it last; a search box filters every
 * setting; the messaging switches keep their own confirmation; «قيم مخصصة» holds free-form entries.
 */
export function SettingsPage() {
  const settings = useQuery(settingsQuery);
  const metaQuery = useQuery(configMetaQuery);
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
        <SettingsNav className="shell:sticky shell:top-20 shell:self-start" extra={EXTRA_NAV} />
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
