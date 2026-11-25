import { Button, t } from '@ab/web-kit';

/** Per-field reset to default, shown only while the field differs from its default. */
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
