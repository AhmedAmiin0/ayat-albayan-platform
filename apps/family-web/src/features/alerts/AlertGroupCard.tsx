import type { AlertGroup, AlertSection } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';
import { FamilyCard } from '@ab/web-kit/family/layout/FamilyCard';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { GROUP_TONE } from './alert-look';
import { AlertRow } from './AlertRow';

const GROUP_TITLE: Readonly<Record<AlertGroup, () => string>> = {
  today: () => t.portal.app.alerts.today,
  yesterday: () => t.portal.app.alerts.yesterday,
  week: () => t.portal.app.alerts.week,
  older: () => t.portal.app.alerts.older,
};

interface Props {
  section: AlertSection;
  /** What every row of the group shares. */
  row: { kind: PortalKind; tz: string; onRead: (id: string) => void };
}

/**
 * One day group of the bell (boards: «◆ اليوم» over a hairline, then one card of rows split by
 * hairlines, its top edge coloured by the group).
 */
export function AlertGroupCard({ section, row }: Props) {
  const title = GROUP_TITLE[section.group]();
  return (
    <section aria-label={title} className="grid gap-3">
      <h2 className="flex items-center gap-3 text-[20px] font-extrabold text-ink">
        <span aria-hidden="true" className="size-2 shrink-0 rotate-45 bg-gold" />
        {title}
        <span aria-hidden="true" className="h-px flex-1 bg-rule" />
      </h2>
      <FamilyCard tone={GROUP_TONE[section.group]} className="overflow-hidden p-0 sm:p-0">
        <ul className="divide-y divide-rule">
          {section.items.map((alert) => (
            <AlertRow key={alert.id} alert={alert} kind={row.kind} tz={row.tz}
              onRead={row.onRead} />
          ))}
        </ul>
      </FamilyCard>
    </section>
  );
}
