import { recordingMinutes } from '@ab/client-core';
import type { PortalLessonAssets, PortalStudent } from '@ab/shared';
import type { OpenReport } from '#/portal/report/ReportView.tsx';
import { Icon, Button, Pill } from '#/components/ui/index.ts';
import { useClock } from '#/lib/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { lessonLine, lessonTitle } from './lesson-words';
import { ReportSummary } from './ReportSummary';

interface HeadProps {
  view: PortalLessonAssets;
  student: Pick<PortalStudent, 'name' | 'tz'>;
  /** h1 on the lesson's own page, h2 in the recordings tab. */
  level: 1 | 2;
}

const TITLE = {
  1: 'font-display text-h2 font-bold',
  2: 'text-body font-bold',
} as const;

/** «تسجيل مرئي · 44 دقيقة» beside the title when the lesson's recording is a video. */
function VideoChip({ view }: { view: PortalLessonAssets }) {
  const video = view.recordings.find((r) => r.media === 'video');
  if (!video) return null;
  const minutes = recordingMinutes(video.duration_seconds);
  return <Pill tone="neutral">{t.familyFiles.videoChip.replace('{minutes}', minutes)}</Pill>;
}

/** «حلقة الخميس، 12 نوفمبر» and «يوسف · مع أ. فاطمة · 6:30 م – 7:15 م» on the student's clock. */
export function LessonHead({ view, student, level }: HeadProps) {
  const clock = { ...useClock(), tz: student.tz };
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="grid gap-0.5">
        <Heading className={TITLE[level]}>{lessonTitle(view.lesson_starts_at, clock)}</Heading>
        <p className="text-sm text-ink-3">{lessonLine(view, { name: student.name, clock })}</p>
      </div>
      <VideoChip view={view} />
    </div>
  );
}

/**
 * «من تقرير هذه الحلقة» and «اقرأ التقرير كاملًا», which opens the report's own page (without
 * the recording button: recordings spec §1 rule).
 */
export function ReportBlock({ reportId, onOpenReport }: {
  reportId: string;
  onOpenReport: (report: OpenReport) => void;
}) {
  return (
    <>
      <ReportSummary reportId={reportId} />
      <Button
        type="button"
        variant="secondary"
        className="justify-self-start"
        onClick={() => onOpenReport({ reportId, recordingId: null })}
      >
        <Icon name="receipt" />
        {t.lessonFiles.openReport}
      </Button>
    </>
  );
}
