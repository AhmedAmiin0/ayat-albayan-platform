import type { CourseExtendPreview } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import { extendLines } from './card-text';

/** «مدّ الجدول»'s lines: the lessons with their dates and the new last day (loading until then). */
export function ExtendPreviewList({ preview }: { preview: CourseExtendPreview | undefined }) {
  const tz = useViewerTz();
  if (!preview) return <p className="text-ink-3">{t.common.loading}</p>;
  return (
    <ul role="status" className="grid list-disc gap-1 rounded-md bg-sunk px-7 py-2.5">
      {extendLines(preview, tz).map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
