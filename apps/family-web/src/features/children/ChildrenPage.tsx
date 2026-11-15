import type { PortalHome } from '@ab/shared';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChildSummaryCard } from './ChildSummaryCard';

/** «أبنائي» (a guardian's tab): a card per child; each child's reports live inside its page. */
export function ChildrenPage({ home }: { home: PortalHome }) {
  return (
    <section aria-labelledby="children-title" className="grid gap-4">
      <h1 id="children-title" className="font-display text-h2 font-bold">
        {t.portal.app.tabs.children}
      </h1>
      {home.students.length === 0 && (
        <EmptyState title={t.portal.noStudents}>{t.portal.noStudentsHint}</EmptyState>
      )}
      {home.students.map((student) => (
        <ChildSummaryCard key={student.id} student={student} kind={home.kind} />
      ))}
      <p className="text-center text-xs text-ink-3">{t.portal.app.children.note}</p>
    </section>
  );
}
