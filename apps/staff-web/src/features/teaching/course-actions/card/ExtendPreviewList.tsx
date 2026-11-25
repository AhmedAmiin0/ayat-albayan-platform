import type { CourseExtendPreview } from '@ab/shared';
import { t, useViewerTz } from '@ab/web-kit';
import { extendLines } from './card-text';

/** Loading until the preview arrives. */
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
