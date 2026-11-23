import { subscriptionStatusStyle, type CourseCardView } from '@ab/shared';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { CardLessons } from './CardLessons';
import { CardSummary } from './CardSummary';
import { packageLines } from './card-text';

interface CardBodyProps {
  card: CourseCardView | undefined;
  /** After a write from a lesson's drawer: what it did. */
  onDone: (message: string) => void;
}

/** Only the title while loading. */
export function CardBody({ card, onDone }: CardBodyProps) {
  const tz = useViewerTz();
  const pkg = card?.package ?? null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="course-card" className="text-base font-semibold text-ink">
          {t.courseCard.title}
        </h2>
        {pkg && <span className="font-semibold text-ink">{packageLines(pkg, tz).left}</span>}
        {pkg && (
          <StatusChip
            size="sm"
            {...subscriptionStatusStyle[pkg.status]}
            label={t.enums.subscriptionStatus[pkg.status]}
          />
        )}
      </div>
      {card && <CardSummary card={card} />}
      {card?.course && <CardLessons lessons={card.upcoming} onDone={onDone} />}
    </>
  );
}
