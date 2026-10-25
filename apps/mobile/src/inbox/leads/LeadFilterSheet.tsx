import { LEAD_SOURCES, NO_ASSIGNEE, type LeadSource } from '@ab/shared';
import type { ReactNode } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { activeFilterCount, NO_FILTERS, type LeadFilters } from './lead-filters';
import { leadSortChoices, leadSortFromValue, leadSortValue } from './lead-sort';

export interface LeadFilterSheetProps {
  visible: boolean;
  filters: LeadFilters;
  /** The salespeople (empty when the role cannot list them): only «الكل» and «بدون مسؤول» then. */
  people: readonly { id: string; name: string }[];
  /** The leads the filters leave: «عرض النتائج (14)». */
  total: number | undefined;
  onChange: (next: LeadFilters) => void;
  onClose: () => void;
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink2 }}>{label}</AppText>
      {children}
    </View>
  );
}

/** «تصفية»: the source, «مسؤول المبيعات» and the order of the leads, like the web LeadFilterFields. */
export function LeadFilterSheet({ visible, filters, people, total, onChange, onClose }: LeadFilterSheetProps) {
  const sources: FilterPill<string>[] = [
    { value: '', label: t.leads.sourceAll },
    ...LEAD_SOURCES.map((s) => ({ value: s, label: t.enums.leadSource[s] })),
  ];
  const owners: FilterPill<string>[] = [
    { value: '', label: t.leads.assigneeAll },
    { value: NO_ASSIGNEE, label: t.sales.assign.none },
    ...people.map((p) => ({ value: p.id, label: p.name })),
  ];
  const count = activeFilterCount(filters);
  const results = total === undefined ? t.common.close : t.mobileLeads.showResults.replace('{n}', String(total));
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen sheet>
        <ScreenHeader
          title={t.mobileLeads.filterTitle}
          trailing={count ? <Button variant="ghost" label={t.mobileLeads.clearFilters} onPress={() => onChange(NO_FILTERS)} /> : undefined}
        />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 16 }}>
          <Group label={t.leads.source}>
            <FilterPills
              wrap
              role="radiogroup"
              accessibilityLabel={t.leads.source}
              items={sources}
              value={filters.source ?? ''}
              onChange={(v) => onChange({ ...filters, source: LEAD_SOURCES.find((s): s is LeadSource => s === v) })}
            />
          </Group>
          <Group label={t.sales.assign.label}>
            <FilterPills
              wrap
              role="radiogroup"
              accessibilityLabel={t.sales.assign.label}
              items={owners}
              value={filters.assignee ?? ''}
              onChange={(v) => onChange({ ...filters, assignee: v || undefined })}
            />
          </Group>
          <Group label={t.leads.sortBy}>
            <FilterPills
              wrap
              role="radiogroup"
              accessibilityLabel={t.leads.sortBy}
              items={leadSortChoices()}
              value={leadSortValue(filters)}
              onChange={(v) => {
                const { sort, dir } = leadSortFromValue(v);
                onChange({ ...filters, sort, dir });
              }}
            />
          </Group>
        </ScrollView>
        <Button label={results} onPress={onClose} />
      </Screen>
    </Modal>
  );
}
