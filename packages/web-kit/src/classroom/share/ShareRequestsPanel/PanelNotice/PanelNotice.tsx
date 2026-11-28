import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { PanelNoticeProps } from './PanelNotice.types';

export function PanelNotice({ notice, onDismiss }: PanelNoticeProps) {
  if (notice === null) return null;
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-md border border-rule bg-raised px-3 py-1.5 text-sm"
    >
      {notice}
      <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
        {t.common.close}
      </Button>
    </p>
  );
}
