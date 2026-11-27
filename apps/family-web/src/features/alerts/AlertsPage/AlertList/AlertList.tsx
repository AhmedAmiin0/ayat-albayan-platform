import { EmptyState, SectionHeader, t } from '@ab/web-kit';
import { AlertRow } from '@/features/alerts/AlertRow';
import { GROUP_TITLE } from './alert-list.helpers';
import type { AlertListProps } from './AlertList.types';
import { useAlertList } from './use-alert-list';

export function AlertList({ page, kind, onRead }: AlertListProps) {
  const { tz, sections } = useAlertList({ page });
  if (sections.length === 0) return <EmptyState title={t.bell.empty} />;
  return (
    <>
      {sections.map((section) => (
        <section
          key={section.group}
          aria-label={GROUP_TITLE[section.group]()}
          className="grid gap-2"
        >
          <SectionHeader title={GROUP_TITLE[section.group]()} />
          <ul className="grid gap-2">
            {section.items.map((alert) => (
              <AlertRow key={alert.id} alert={alert} kind={kind} tz={tz} onRead={onRead} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
