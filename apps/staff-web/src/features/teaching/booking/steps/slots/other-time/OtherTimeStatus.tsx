import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { OtherTimeStatusProps } from './OtherTime';

/** A failed read, the loading line, or an empty fortnight. */
export function OtherTimeStatus({ isError, isPending }: OtherTimeStatusProps) {
  if (isError) return <FormAlert>{t.booking.slotsError}</FormAlert>;
  return (
    <p className="text-xs text-ink-3">{isPending ? t.common.loading : t.booking.otherTimeEmpty}</p>
  );
}
