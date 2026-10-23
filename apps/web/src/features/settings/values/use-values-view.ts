import { useQuery } from '@tanstack/react-query';
import { customConfigQuery } from '@/features/custom-config/custom-api';
import { googleStatusQuery } from '@/features/google-sync/google-api';
import { t } from '@/lib/i18n';
import { allRows, groupRows, type RowQuery } from './value-rows';
import { GROUP_IDS, groupLabel, groupOfKey, isOwnedGroup, OWNER_PAGE, resolveGroup } from './value-groups-view';
import { useValues } from './values-context';
import { showsAll, type ValuesSearch } from './values-search';

/**
 * What «القيم» shows for the URL's search: one group, or «الكل» (the search/filter results from
 * every group). The custom values and the Google status are read here (Google only when shown).
 */
export function useValuesView(search: ValuesSearch) {
  const api = useValues();
  const group = resolveGroup(search.group);
  const all = showsAll(search);
  const custom = useQuery(customConfigQuery);
  const entries = custom.data ?? [];
  const google = useQuery({ ...googleStatusQuery, enabled: all || group === 'google' }).data?.settings;
  const query: RowQuery = { q: search.q ?? '', filter: search.filter, settings: api.settings, google };
  const rows = all ? allRows(entries, query) : groupRows(group, entries);
  const dirty = api.canWrite ? api.drafts.dirtyKeys() : [];
  const first = dirty[0];
  return {
    group,
    all,
    google,
    rows,
    /** «قيم مخصصة» in view: its list failed to load, or is still loading. */
    customFailed: group === 'custom' && !all && custom.isError,
    customLoading: group === 'custom' && !all && custom.isPending,
    retryCustom: () => void custom.refetch(),
    caption: all ? t.settingsValues.all : groupLabel(group),
    note: !all && isOwnedGroup(group) ? OWNER_PAGE[group].label : undefined,
    counts: Object.fromEntries(GROUP_IDS.map((id) => [id, groupRows(id, entries).length])),
    filterCounts: {
      modified: allRows(entries, { ...query, q: '', filter: 'modified' }).length,
      public: allRows(entries, { ...query, q: '', filter: 'public' }).length,
    },
    dirty,
    /** «N قيم لم تُحفظ» opens the group of the first unsaved row. */
    firstDirtyGroup: (first && groupOfKey(first)) ?? group,
  };
}
