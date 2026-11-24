import { SETTING_DEFAULTS } from '@ab/settings';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { settingText } from '@/components/settings/search/setting-text';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { CustomDialogs } from '@/features/platform/custom-config/CustomDialogs';
import { useCustomValues } from '@/features/platform/custom-config/use-custom-values';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useConfigEntries } from '@/lib/settings/config-entries-api';
import { settingsQuery } from '@/lib/settings/settings-api';
import { settingsMetaQuery } from '@/features/platform/settings/settings-meta-api';
import { ConfirmValueDialog } from './sheet/ConfirmValueDialog';
import type { DescribeTarget } from './description/describe-target';
import { DescriptionDialog } from './description/DescriptionDialog';
import { UndoToast } from './sheet/UndoToast';
import { useDescribeRights } from './description/use-describe-rights';
import { useValuesController } from './hooks/use-values-controller';
import { ValuesBody } from './ValuesBody';
import { ValuesContext } from './values-context';
import type { ValuesSearch } from './values-search';

export interface ValuesViewProps {
  search: ValuesSearch;
  onSearch: (next: ValuesSearch) => void;
  /** The leave-page guard (router-bound; the route passes it), given the unsaved rows' names. */
  renderGuard?: (names: string[]) => ReactNode;
}

/** One group per view (docs/26b §2), each row saves on its own; editors need settings.write. */
export function ValuesView({ search, onSearch, renderGuard }: ValuesViewProps) {
  const settings = useQuery(settingsQuery);
  const meta = useQuery(settingsMetaQuery);
  const entries = useConfigEntries();
  const canWrite = usePermissions().can('settings.write');
  const rights = useDescribeRights();
  const [describing, setDescribing] = useState<DescribeTarget | null>(null);
  const [customNote, setCustomNote] = useState<string | null>(null);
  const custom = useCustomValues(setCustomNote);
  const ctl = useValuesController({
    settings: settings.data ?? SETTING_DEFAULTS,
    meta: meta.data ?? {},
    canWrite,
    entries,
    describe: setDescribing,
  });
  const dirtyNames = ctl.api.drafts.dirtyKeys().map((k) => settingText(k).label);
  return (
    <ValuesContext.Provider value={ctl.api}>
      <ValuesBody
        search={search}
        onSearch={onSearch}
        loading={settings.isPending}
        failed={settings.isError}
        onRetry={() => void settings.refetch()}
        custom={custom}
      />
      <p aria-live="polite" className="sr-only">
        {ctl.said}
      </p>
      {ctl.pending && <ConfirmValueDialog pending={ctl.pending} onYes={ctl.confirm} onClose={ctl.cancel} />}
      {describing && (
        <DescriptionDialog
          target={describing}
          entry={ctl.api.entry(describing.key)}
          rights={rights}
          onClose={() => setDescribing(null)}
          onDone={ctl.api.announce}
        />
      )}
      <CustomDialogs custom={custom} />
      {ctl.note && (
        <UndoToast
          key={ctl.note.id}
          message={t.settingsValues.saved}
          onDismiss={ctl.dismissNote}
          onUndo={() => ctl.note && ctl.undo(ctl.note)}
        />
      )}
      {customNote && !ctl.note && <Toast message={customNote} onDismiss={() => setCustomNote(null)} />}
      {renderGuard?.(dirtyNames)}
    </ValuesContext.Provider>
  );
}
