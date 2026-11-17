import { t } from '@ab/mobile-kit';
import { useViewerTz } from '@/core/lib/clock';
import { resumeLines } from './card-text';
import { useResumePreview } from './course-card-api';

/**
 * «استئناف الدورة الآن؟» with what it does (owner 2026-11-17): the lessons back with their dates
 * and the days the package moves (GET …/resume-preview, only while asking); the general words
 * until it answers or if it fails.
 */
export function useResumeAsk(input: { studentId: string; asking: boolean }): string {
  const tz = useViewerTz();
  const preview = useResumePreview({ studentId: input.studentId, enabled: input.asking });
  const c = t.coursePause;
  if (!preview.data) return `${c.resumeTitle} ${c.resumeBody}`;
  return [c.resumeAsk, ...resumeLines(preview.data, tz)].join('\n');
}
