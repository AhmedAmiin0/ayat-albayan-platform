import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { AssignUnassigned } from './AssignUnassigned';
import { LeadFilterSheet } from './LeadFilterSheet';
import { activeFilterCount, type LeadFilters } from './lead-filters';
import { useSalesPeople } from './use-sales-people';

export interface LeadsFilterBarProps {
  filters: LeadFilters;
  onChange: (next: LeadFilters) => void;
  total: number | undefined;
}

/** «تصفية (n)» opens the filter sheet; «عيّن العملاء…» is the admin's bulk action (leads.assign only). */
export function LeadsFilterBar({ filters, onChange, total }: LeadsFilterBarProps) {
  const can = usePermissions();
  const canAssign = can('leads.assign');
  const { people } = useSalesPeople(canAssign);
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);
  return (
    <View style={{ gap: 8 }}>
      <Button
        variant="secondary"
        label={count ? t.mobileLeads.filterCount.replace('{n}', String(count)) : t.mobileLeads.filter}
        onPress={() => setOpen(true)}
      />
      {canAssign ? <AssignUnassigned owners={people.length} /> : null}
      <LeadFilterSheet
        visible={open}
        filters={filters}
        people={canAssign ? people : []}
        total={total}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
