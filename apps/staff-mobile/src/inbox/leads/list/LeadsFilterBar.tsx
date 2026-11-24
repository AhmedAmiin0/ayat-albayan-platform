import { useState } from 'react';
import { usePermissions, t } from '@ab/mobile-kit';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { LeadFilterSheet } from './LeadFilterSheet';
import { activeFilterCount, type LeadFilters } from './lead-filters';
import { useSalesPeople } from '@/inbox/leads/detail/use-sales-people';

interface LeadsFilterBarProps {
  filters: LeadFilters;
  onChange: (next: LeadFilters) => void;
  total: number | undefined;
}

export function LeadsFilterBar({ filters, onChange, total }: LeadsFilterBarProps) {
  const can = usePermissions();
  const canAssign = can('leads.assign');
  const { people } = useSalesPeople(canAssign);
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);
  return (
    <>
      <PillButton
        label={count ? t.mobileLeads.filterCount.replace('{n}', String(count)) : t.mobileLeads.filter}
        onPress={() => setOpen(true)}
      />
      <LeadFilterSheet
        visible={open}
        filters={filters}
        people={canAssign ? people : []}
        assign={canAssign}
        total={total}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
