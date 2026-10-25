import { LEAD_STATUSES, type LeadStatus } from '@ab/shared';
import { Tabs, type TabOption } from '@/components/ui/layout/tabs';
import { paneScroll } from '@/components/ui/layout/rail';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Tab = LeadStatus | 'all';

// Funnel order (LEAD_STATUSES), grouped الكل / the funnel / مردّش + عميل ضايع (docs/07 §9).
// TODO(R-LEAD-02): per-status counts like page numbers once the API returns them (the list
// endpoint only gives `total` for the current filter).
const TABS: TabOption<Tab>[] = [
  { value: 'all', label: t.leads.filterAll },
  ...LEAD_STATUSES.map((s) => ({
    value: s,
    label: t.enums.leadStatus[s],
    separatorBefore: s === 'new' || s === 'no_reply',
  })),
];

export interface LeadStatusTabsProps {
  value: LeadStatus | undefined;
  onChange: (value: LeadStatus | undefined) => void;
}

/** Status filter as a vertical fihris beside the list; chips under 900px (R-LEAD-02, docs/07 §9). */
export function LeadStatusTabs({ value, onChange }: LeadStatusTabsProps) {
  return (
    <div className={cn('min-w-0', paneScroll)}>
      <Tabs
        orientation="vertical"
        label={t.leads.status}
        tabs={TABS}
        value={value ?? 'all'}
        onChange={(tab) => onChange(tab === 'all' ? undefined : tab)}
      />
    </div>
  );
}
