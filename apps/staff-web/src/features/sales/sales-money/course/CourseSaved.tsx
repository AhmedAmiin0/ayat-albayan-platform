import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** The picks kept as a draft: booked once paid, editable till then. */
export function CourseSaved({ onClose }: { onClose: () => void }) {
  return (
    <div className="grid gap-4">
      <p role="status" className="text-sm font-semibold text-ok">{t.courseDraft.saved}</p>
      <div className="flex justify-end">
        <Button type="button" onClick={onClose}>{t.common.close}</Button>
      </div>
    </div>
  );
}
