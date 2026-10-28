import { useState } from 'react';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { LeadFilterSheet } from './LeadFilterSheet';
import { activeFilterCount, type LeadFilters } from './lead-filters';
import { useSalesPeople } from '../detail/use-sales-people';

interface LeadsFilterBarProps {
  filters: LeadFilters;
  onChange: (next: LeadFilters) => void;
  total: number | undefined;
}

/**
 * «تصفية (n)»: a compact pill at the head of the status row (owner 2026-10-28: the list screens' one
 * compact top) that opens the filter sheet; the admin's bulk «عيّن العملاء…» (leads.assign) lives in
 * the sheet beside the owner filter, so the list's top is one row.
 */
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
