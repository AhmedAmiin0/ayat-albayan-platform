import { normalizePhone } from '@ab/core';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Live E.164 preview under the phone input (docs/07 §6, R-STU-02). */
export function PhonePreview({ value }: { value: string }) {
  const r = normalizePhone(value);
  if (!r.ok) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-ok">
      <Icon name="check" className="size-[15px]" />
      <span>
        {t.students.phoneSavedAs} <Ltr>{r.e164}</Ltr>
      </span>
    </p>
  );
}
