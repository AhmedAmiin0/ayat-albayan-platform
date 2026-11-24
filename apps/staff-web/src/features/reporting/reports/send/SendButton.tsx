import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface SendButtonProps {
  label: string;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function SendButton({ label, pending, disabled, onClick }: SendButtonProps) {
  return (
    <Button type="button" size="lg" disabled={disabled || pending} aria-busy={pending}
      onClick={onClick}>
      {pending && (
        <span aria-hidden="true" data-testid="send-spinner"
          className="me-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-e-transparent" />
      )}
      {pending ? t.reports.submitting : label}
    </Button>
  );
}
