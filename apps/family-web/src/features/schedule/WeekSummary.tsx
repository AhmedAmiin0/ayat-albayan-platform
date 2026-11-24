import type { WeekSummary as Summary } from '@ab/client-core';
import type { ReactNode } from 'react';
import { Card } from '@ab/web-kit/components/ui/surface/card';
import { Pill } from '@ab/web-kit/components/ui/surface/pill';
import { SectionHeader } from '@ab/web-kit/components/ui/surface/section-header';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const S = t.portal.app.schedule;

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-sm text-ink-2">{term}</dt>
      <dd className="text-sm font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

/** A pill while any lesson waits for the guardian, else a plain 0. */
const Awaiting = ({ n }: { n: number }) => (n > 0 ? <Pill tone="act">{n}</Pill> : <>{n}</>);

interface WeekSummaryProps {
  summary: Summary;
  /** Only a guardian confirms lessons, so only a guardian sees what waits. */
  guardian: boolean;
}

export function WeekSummary({ summary, guardian }: WeekSummaryProps) {
  const teachers = summary.teachers.map((x) => teacherLabel(x)).join(' · ');
  return (
    <Card asChild className="grid gap-1 p-4">
      <section aria-labelledby="week-summary-title">
        <SectionHeader id="week-summary-title" title={S.summary} />
        <dl className="grid divide-y divide-rule">
          <Row term={S.lessons}>{summary.lessons}</Row>
          {guardian && (
            <Row term={S.awaiting}>
              <Awaiting n={summary.awaiting} />
            </Row>
          )}
          {teachers && <Row term={S.teachers}>{teachers}</Row>}
        </dl>
      </section>
    </Card>
  );
}
