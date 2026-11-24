import { recordingMinutes } from '@ab/client-core';
import type { PortalLessonAssets, PortalStudent } from '@ab/shared';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Pill } from '@ab/web-kit/components/ui/surface/pill';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
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

/** Shown beside the title when the lesson's recording is a video. */
function VideoChip({ view }: { view: PortalLessonAssets }) {
  const video = view.recordings.find((r) => r.media === 'video');
  if (!video) return null;
  const minutes = recordingMinutes(video.duration_seconds);
  return <Pill tone="neutral">{t.familyFiles.videoChip.replace('{minutes}', minutes)}</Pill>;
}

/** On the student's clock. */
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

/** The report page opens without the recording button (recordings spec §1). */
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
