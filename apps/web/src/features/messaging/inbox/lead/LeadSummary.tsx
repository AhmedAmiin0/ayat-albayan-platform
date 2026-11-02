import { useId } from 'react';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import type { InboxLead } from '@/features/messaging/inbox/api/api';
import { leadSummary } from './lead-summary';

/** «بيانات الطالب» at a glance in the aside: only what is filled (R-LEAD-03). Read-only. */
export function LeadSummary({ lead }: { lead: InboxLead }) {
  const headingId = useId();
  const rows = leadSummary(lead, useClock());
  return (
    <section aria-labelledby={headingId} className="grid gap-2 border-y border-rule py-3">
      <h3 id={headingId} className="text-sm font-semibold">
        {t.leads.qualification}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-3">{t.inbox.noLeadData}</p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-ink-3">{r.label}</dt>
              <dd className="min-w-0 break-words text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
