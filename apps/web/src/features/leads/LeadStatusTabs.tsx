import { LEAD_STATUSES, type LeadStatus } from '@ab/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const TABS: { value: LeadStatus | undefined; label: string }[] = [
  { value: undefined, label: t.leads.filterAll },
  ...LEAD_STATUSES.map((s) => ({ value: s, label: t.enums.leadStatus[s] })),
];

export interface LeadStatusTabsProps {
  value: LeadStatus | undefined;
  onChange: (value: LeadStatus | undefined) => void;
}

/** Status filter tabs over the lead inbox (R-LEAD-02). */
export function LeadStatusTabs({ value, onChange }: LeadStatusTabsProps) {
  return (
    <div role="tablist" aria-label={t.leads.status} className="flex flex-wrap gap-1">
      {TABS.map((tab) => (
        <button
          key={tab.value ?? 'all'}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm',
            tab.value === value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
