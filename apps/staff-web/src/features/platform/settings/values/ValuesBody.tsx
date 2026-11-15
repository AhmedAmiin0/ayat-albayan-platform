import type { SettingKey } from '@ab/shared';
import { useState } from 'react';
import { useBelowShell, usePhone } from '@/components/ui/layout/use-narrow';
import type { CustomValues } from '@/features/platform/custom-config/use-custom-values';
import { t } from '@/lib/i18n/i18n';
import { GroupNav } from './GroupNav';
import type { RowEnv } from './rows/ValueRowView';
import { valueCounts } from './lib/value-rows';
import { ValueSheet } from './sheet/ValueSheet';
import { GroupEmpty, ValuesEmpty, ValuesLoadError } from './ValuesStates';
import { ValuesHead } from './ValuesHead';
import { ValuesTable } from './ValuesTable';
import { ValuesToolbar } from './ValuesToolbar';
import { useValues } from './values-context';
import type { ValuesSearch } from './values-search';
import { useValuesView } from './hooks/use-values-view';

export interface ValuesBodyProps {
  search: ValuesSearch;
  onSearch: (next: ValuesSearch) => void;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  custom: CustomValues;
}

/** The page: head, search and filters, the group list (side list ≥ shell, chips below) and one table. */
export function ValuesBody({ search, onSearch, loading, failed, onRetry, custom }: ValuesBodyProps) {
  const api = useValues();
  const phone = usePhone();
  const chips = useBelowShell();
  const [sheet, setSheet] = useState<SettingKey | null>(null);
  const view = useValuesView(search);
  const env: RowEnv = { phone, showGroup: view.all, google: view.google, custom, onOpen: setSheet };
  const clear = () => onSearch(search.group ? { group: search.group } : {});
  const nav = (
    <GroupNav
      current={view.all ? null : view.group}
      counts={view.counts}
      allCount={view.all ? view.rows.length : undefined}
      phone={chips}
      onPick={(id) => onSearch({ group: id })}
    />
  );
  const busy = loading || view.customLoading;
  const empty = view.all && view.rows.length === 0 && !loading;
  const groupEmpty = !view.all && view.rows.length === 0 && !busy && !view.customFailed;
  return (
    <>
      <ValuesHead
        canWrite={api.canWrite}
        counts={loading || failed ? undefined : valueCounts(api.settings)}
        unsaved={view.dirty.length}
        onUnsaved={() => onSearch({ group: view.firstDirtyGroup })}
        onAdd={custom.add}
        phone={phone}
      />
      <ValuesToolbar
        q={search.q ?? ''}
        filter={search.filter}
        onQ={(q) => onSearch({ ...search, q })}
        onFilter={(filter) => onSearch({ ...search, filter })}
        phone={phone}
        counts={view.filterCounts}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 shell:grid-cols-[220px_minmax(0,1fr)] shell:gap-8">
        {chips ? <div className="min-w-0">{nav}</div> : <aside className="shell:sticky shell:top-20 shell:self-start">{nav}</aside>}
        <div className="min-w-0">
          {failed && <ValuesLoadError onRetry={onRetry} />}
          {!failed && view.customFailed && <ValuesLoadError onRetry={view.retryCustom} message={t.config.custom.loadError} />}
          {!failed && empty && <ValuesEmpty onClear={clear} />}
          {!failed && groupEmpty && <GroupEmpty />}
          {!failed && !empty && !groupEmpty && !view.customFailed && (
            <ValuesTable caption={view.caption} note={view.note} rows={view.rows} env={env} loading={busy} />
          )}
          {view.all && !empty && (
            <button type="button" onClick={clear} className="mt-3 min-h-11 text-sm font-semibold text-lapis underline underline-offset-4 sm:min-h-8">
              {t.settingsValues.clearSearch}
            </button>
          )}
        </div>
      </div>
      {sheet && <ValueSheet settingKey={sheet} onClose={() => setSheet(null)} />}
    </>
  );
}
