import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/** Per-field «أعد القيمة الافتراضية»: shown only while the field differs from its default. */
export function ResetButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-label={t.config.resetFor.replace('{name}', name)}
      title={t.config.reset}
      onClick={onClick}
    >
      {t.config.reset}
    </Button>
  );
}
