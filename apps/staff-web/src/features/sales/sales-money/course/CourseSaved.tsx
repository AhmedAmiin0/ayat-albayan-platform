import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';

/** The picks kept as a draft (owner 2026-11-06): booked once paid, editable till then. */
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
