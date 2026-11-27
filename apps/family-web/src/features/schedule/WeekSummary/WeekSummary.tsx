import { Card, SectionHeader } from '@ab/web-kit';
import type { WeekSummaryProps } from './WeekSummary.types';
import { S, teachersLine } from './week-summary.helpers';
import { Row } from './Row';
import { Awaiting } from './Awaiting';

export function WeekSummary({ summary, guardian }: WeekSummaryProps) {
  const teachers = teachersLine(summary.teachers);
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
