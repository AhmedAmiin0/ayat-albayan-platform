import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Marks a report not opened in this browser yet. */
export function NewMark() {
  return (
    <span className="rounded-sm bg-act-soft px-1.5 py-0.5 text-xs font-semibold text-act">
      {t.portal.newReport}
    </span>
  );
}
