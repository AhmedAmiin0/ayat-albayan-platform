import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Section } from '@/more/Section';
import { ErrorLine } from '@/inbox/ErrorLine';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { FilterPills } from '@/core/ui/form/FilterPills';
import {
  ALL,
  ENTITIES,
  isFiltered,
  NO_FILTERS,
  ROLES,
  dateError,
  type ActivityFilters,
} from './activity-filters';
import { entityLabel, roleLabel } from './activity-format';

interface ActivityFilterBarProps {
  value: ActivityFilters;
  onChange: (next: ActivityFilters) => void;
}

const pills = (values: readonly string[], label: (v: string) => string) => [
  { value: ALL, label: t.mobileAdmin.activity.all },
  ...values.map((v) => ({ value: v, label: label(v) })),
];

/** Who (role), what (item) and when (from / to day): the filters the API takes, applied as typed. */
export function ActivityFilterBar({ value, onChange }: ActivityFilterBarProps) {
  const a = t.mobileAdmin.activity;
  const err = dateError(value);
  const set = (patch: Partial<ActivityFilters>) => onChange({ ...value, ...patch });
  return (
    <View style={{ gap: 12 }}>
      <Section title={a.role}>
        <FilterPills
          items={pills(ROLES, roleLabel)}
          value={value.role}
          onChange={(role) => set({ role })}
          accessibilityLabel={a.role}
        />
      </Section>
      <Section title={a.entity}>
        <FilterPills
          items={pills(ENTITIES, entityLabel)}
          value={value.entity}
          onChange={(entity) => set({ entity })}
          accessibilityLabel={a.entity}
        />
      </Section>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label={a.from}
            value={value.from}
            placeholder={a.datePlaceholder}
            onChangeText={(from) => set({ from })}
            keyboardType="numbers-and-punctuation"
            ltr
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label={a.to}
            value={value.to}
            placeholder={a.datePlaceholder}
            onChangeText={(to) => set({ to })}
            keyboardType="numbers-and-punctuation"
            ltr
          />
        </View>
      </View>
      {err ? <ErrorLine message={a[err]} /> : null}
      {isFiltered(value) || value.from || value.to ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button variant="ghost" label={a.clear} onPress={() => onChange(NO_FILTERS)} />
        </View>
      ) : null}
    </View>
  );
}
