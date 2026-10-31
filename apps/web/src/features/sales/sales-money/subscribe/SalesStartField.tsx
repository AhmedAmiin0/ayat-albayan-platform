import { daysBefore, SALES_START_BACK_DAYS } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { NoCommissionNote, UsedBeforeField } from '@/features/finance/subscriptions';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';

/** `usedBefore`: «حلقات مستخدمة من الباقة», only with «بدأ الاشتراك سابقًا» (0 otherwise). */
export type StartValue = { startsOn: string; alreadyStarted: boolean; usedBefore: number };

type Props = {
  /** Holds subscriptions.set_start_date. */
  canSet: boolean;
  /** Today in Riyadh (YYYY-MM-DD): the default day. */
  today: string;
  value: StartValue;
  /** usedBeforeMax(lessons of the chosen package). */
  usedMax: number;
  onChange: (patch: Partial<StartValue>) => void;
  error?: string | null;
};

/**
 * The package's first day (owner 2026-10-12, docs/16 row 24): without subscriptions.set_start_date only
 * «تبدأ الباقة اليوم»; with it a day from today on, or up to a year back with «بدأ الاشتراك سابقًا», then
 * the lessons already used (owner 2026-10-28); unticking it puts them back to 0.
 */
export function SalesStartField({ canSet, today, value, usedMax, onChange, error }: Props) {
  if (!canSet) return <p className="text-sm text-ink-2">{t.salesMoney.startsOnDefault.replace('{date}', dateLabel(today))}</p>;
  const min = value.alreadyStarted ? daysBefore(today, SALES_START_BACK_DAYS) : today;
  return (
    <div className="grid gap-3">
      <Field label={t.salesMoney.startsOn} hint={dateLabel(value.startsOn)} error={error ?? undefined}>
        {(p) => (
          <Input
            {...p}
            type="date"
            dir="ltr"
            className="max-w-[220px]"
            min={min}
            value={value.startsOn}
            onChange={(e) => onChange({ startsOn: e.target.value })}
            required
          />
        )}
      </Field>
      <NoCommissionNote startsOn={value.startsOn} usedBefore={value.usedBefore} />
      <label className="flex min-h-11 items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--lapis)]"
          checked={value.alreadyStarted}
          onChange={(e) => onChange({ alreadyStarted: e.target.checked, ...(e.target.checked ? {} : { usedBefore: 0 }) })}
        />
        <span className="grid gap-0.5">
          <span className="text-sm font-semibold text-ink">{t.salesMoney.alreadyStarted}</span>
          <span className="text-xs text-ink-3">{t.salesMoney.alreadyStartedHint}</span>
        </span>
      </label>
      {value.alreadyStarted && <UsedBeforeField value={value.usedBefore} max={usedMax} onChange={(usedBefore) => onChange({ usedBefore })} />}
    </div>
  );
}
