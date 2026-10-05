import type { AcademySettings } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { settingsQuery } from './api';
import { SettingsNav } from './SettingsNav';
import {
  AccountsSection,
  AppearanceSection,
  MessagingSection,
  ReportsSection,
  SalesSection,
  ScheduleSection,
} from './SettingsSections';
import { useSettingsForm } from './use-settings-form';

/** The sections in page order, with one «حفظ» bar for every field (the switches save on their own). */
function SettingsBody({ settings, onSaved }: { settings: AcademySettings; onSaved: () => void }) {
  const state = useSettingsForm(settings, onSaved);
  return (
    <div className="grid min-w-0 gap-10">
      <MessagingSection settings={settings} state={state} />
      <ScheduleSection state={state} />
      <ReportsSection state={state} />
      <AccountsSection state={state} />
      <SalesSection settings={settings} />
      <AppearanceSection />
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
 * sections with an index beside them (a chip row on phones): messages and WhatsApp, schedule,
 * reports, accounts, sales, appearance. Each setting is a row; the messaging switches keep their
 * own confirmation. Semantics and API calls are unchanged.
 */
export function SettingsPage() {
  const settings = useQuery(settingsQuery);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <PageHead>
        <Cartouche>{t.settings.title}</Cartouche>
      </PageHead>
      {settings.isError && <FormAlert>{t.common.error}</FormAlert>}
      {settings.isPending && <ListSkeleton rows={6} />}
      {/* minmax(0,1fr): a wide table scrolls inside its own box instead of widening the page (768px). */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 shell:grid-cols-[200px_minmax(0,1fr)] shell:gap-10">
        <SettingsNav className="shell:sticky shell:top-20 shell:self-start" />
        {settings.data && <SettingsBody settings={settings.data} onSaved={() => setSaved(true)} />}
      </div>
      {saved && <Toast message={t.settings.saved} onDismiss={() => setSaved(false)} />}
    </>
  );
}
