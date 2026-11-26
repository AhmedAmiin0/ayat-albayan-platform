import type { SettingKey } from '@ab/settings';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import {
  useHolds,
  useIsAdmin,
  usePermissions,
  t,
  useTheme,
  ErrorState,
  FilterPills,
  Screen,
} from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { SubScreenHeader } from '@/ops/shared/SubScreenHeader';
import { useSettings } from '@/ops/settings/use-settings';
import { GOOGLE_GROUP } from '@/ops/values/lib/google-values';
import { GoogleValuesTable } from '@/ops/values/table/GoogleValuesTable';
import { useConfigMeta } from '@/ops/values/hooks/use-save-value';
import { GROUP_IDS, groupKeys, groupLabel, type GroupId } from '@/ops/values/lib/value-groups';
import { ValueSheet } from '@/ops/values/sheet/ValueSheet';
import { ValuesTable } from '@/ops/values/table/ValuesTable';

type Chip = GroupId | typeof GOOGLE_GROUP;

/** Google sync appears only for admins who may read its status. */
function useChips(): { value: Chip; label: string; count: number }[] {
  const holds = useHolds('settings.read');
  const admin = useIsAdmin();
  const google = holds && admin;
  const items: { value: Chip; label: string; count: number }[] = GROUP_IDS.map((id) => ({
    value: id,
    label: groupLabel(id),
    count: groupKeys(id).length,
  }));
  return google
    ? [...items, { value: GOOGLE_GROUP, label: t.mobileValues.groups.google, count: 3 }]
    : items;
}

/** A busy region so the screen is never blank. */
function Loading() {
  const { color } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={t.common.loading}
      accessibilityState={{ busy: true }}
      style={{ paddingVertical: 32 }}
    >
      <ActivityIndicator color={color.lapis} />
    </View>
  );
}

/** docs/26b §2, §4; R-MSG-01: scalars need settings.write, one key per save; the rest read-only. */
export function ValuesScreen() {
  const query = useSettings();
  const meta = useConfigMeta().data?.meta;
  const canWrite = usePermissions()('settings.write');
  const chips = useChips();
  const [group, setGroup] = useState<Chip>('schedule');
  const [open, setOpen] = useState<SettingKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const settings = query.data;
  return (
    <Screen>
      <SubScreenHeader title={t.mobileValues.title} />
      <FilterPills
        role="radiogroup"
        accessibilityLabel={t.mobileValues.groupsLabel}
        items={chips}
        value={group}
        onChange={(id) => {
          setGroup(id);
          setNotice(null);
        }}
      />
      {canWrite ? null : <Note>{t.mobileValues.readOnly}</Note>}
      {notice ? (
        <View accessibilityLiveRegion="polite">
          <Note>{notice}</Note>
        </View>
      ) : null}
      {group === GOOGLE_GROUP ? (
        <GoogleValuesTable />
      ) : settings ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          <ValuesTable
            keys={groupKeys(group)}
            settings={settings}
            canWrite={canWrite}
            onOpen={setOpen}
          />
        </ScrollView>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <Loading />
      )}
      {settings && open ? (
        <ValueSheet
          valueKey={open}
          saved={settings[open]}
          canWrite={canWrite}
          meta={meta?.[open]}
          onSaved={() => setNotice(t.config.custom.saved)}
          onClose={() => setOpen(null)}
          onDescribed={setNotice}
        />
      ) : null}
    </Screen>
  );
}
