import type { StripeSecretState } from '@ab/shared';
import { SettingRow } from '@/components/settings/fields/SettingRow';
import { Button } from '@/components/ui/form/button';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { fillText } from '../link-text';

const S = t.paymentLinks.settings;

type Props = {
  label: string;
  state: StripeSecretState;
  value: string;
  onChange: (value: string) => void;
  /** «حذف»: PATCH with null (only while one is saved). */
  onClear: () => void;
  error?: string | undefined;
  busy: boolean;
};

/** A write-only secret: never shown back, only «محفوظ: rk_test_••••abcd» or «غير محفوظ». */
export function SecretField({ label, state, value, onChange, onClear, error, busy }: Props) {
  const saved = state.set ? fillText(S.set, { masked: state.masked ?? '' }) : S.notSet;
  const clear = state.set && (
    <Button type="button" size="sm" variant="danger-quiet" disabled={busy} aria-label={`${S.clear} — ${label}`} onClick={onClear}>
      {S.clear}
    </Button>
  );
  return (
    <SettingRow label={label} hint={saved} {...(error ? { error } : {})} actions={clear}>
      {(p) => (
        <Input
          {...p}
          type="password"
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[260px] max-w-full"
        />
      )}
    </SettingRow>
  );
}
