import { LEAD_STATUSES, type LeadStatus } from '@ab/catalog';
import { Tabs, type TabOption, paneScroll, t, cn } from '@ab/web-kit';

type Tab = LeadStatus | 'all';

// Funnel order (LEAD_STATUSES) grouped as in docs/07 §9.
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
