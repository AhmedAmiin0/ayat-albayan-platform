import type { SettingKey } from '@ab/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills } from '@/ui/FilterPills';
import { Screen } from '@/ui/Screen';
import { SubScreenHeader } from '../SubScreenHeader';
import { useSettings } from '../use-settings';
import { useConfigMeta } from './use-save-value';
import { GROUP_IDS, groupKeys, groupLabel, type GroupId } from './value-groups';
import { ValueSheet } from './ValueSheet';
import { ValuesTable } from './ValuesTable';

/**
 * «القيم» on the phone (docs/26b §2 phone, §4; R-MSG-01): one group at a time in a two-column table;
 * a row opens its bottom sheet. Scalars are edited there with settings.write, one key per save;
 * shapes, lists and module-owned keys are read-only («عدّلها من الموقع»).
 */
export function ValuesScreen() {
  const query = useSettings();
  const meta = useConfigMeta().data?.meta;
  const canWrite = usePermissions()('settings.write');
  const [group, setGroup] = useState<GroupId>('schedule');
  const [open, setOpen] = useState<SettingKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const items = GROUP_IDS.map((id) => ({ value: id, label: groupLabel(id), count: groupKeys(id).length }));
  const settings = query.data;
  return (
    <Screen>
      <SubScreenHeader title={t.mobileValues.title} />
      <FilterPills
        role="radiogroup"
        accessibilityLabel={t.mobileValues.groupsLabel}
        items={items}
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
      {settings ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          <ValuesTable keys={groupKeys(group)} settings={settings} canWrite={canWrite} onOpen={setOpen} />
        </ScrollView>
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : null}
      {settings && open ? (
        <ValueSheet
          valueKey={open}
          saved={settings[open]}
          canWrite={canWrite}
          meta={meta?.[open]}
          onSaved={() => setNotice(t.config.custom.saved)}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </Screen>
  );
}
