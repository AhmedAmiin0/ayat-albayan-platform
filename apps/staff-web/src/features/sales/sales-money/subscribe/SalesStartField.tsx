import { daysBefore, SALES_START_BACK_DAYS } from '@ab/shared';
import { Checkbox, Field, Input, t } from '@ab/web-kit';
import { NoCommissionNote, UsedBeforeField } from '@/features/finance/subscriptions';
import { dateLabel } from '@/features/teaching/schedule';

/** `usedBefore` is lessons already used, only when started before (0 otherwise). */
export interface StartValue {
  startsOn: string;
  alreadyStarted: boolean;
  usedBefore: number;
}

interface Props {
  /** Holds subscriptions.set_start_date. */
  canSet: boolean;
  /** Today in Riyadh (YYYY-MM-DD): the default day. */
  today: string;
  value: StartValue;
  /** usedBeforeMax(lessons of the chosen package). */
  usedMax: number;
  onChange: (patch: Partial<StartValue>) => void;
  error?: string | null;
}

const startHint = (day: string, min: string): string =>
  `${dateLabel(day)} · ${t.datePicker.earliest.replace('{date}', dateLabel(min))}`;

const startedPatch = (checked: boolean): Partial<StartValue> =>
  checked ? { alreadyStarted: true } : { alreadyStarted: false, usedBefore: 0 };

/** Without subscriptions.set_start_date only today (docs/16 row 24); back-dating up to a year. */
export function SalesStartField({ canSet, today, value, usedMax, onChange, error }: Props) {
  if (!canSet) {
    const day = dateLabel(today);
    return (
      <p className="text-sm text-ink-2">{t.salesMoney.startsOnDefault.replace('{date}', day)}</p>
    );
  }
  const min = value.alreadyStarted ? daysBefore(today, SALES_START_BACK_DAYS) : today;
  return (
    <div className="grid gap-3">
      <Field
        label={t.salesMoney.startsOn}
        hint={startHint(value.startsOn, min)}
        error={error ?? undefined}
      >
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
      <Checkbox
        label={t.salesMoney.alreadyStarted}
        hint={t.salesMoney.alreadyStartedHint}
        checked={value.alreadyStarted}
        onCheckedChange={(checked) => onChange(startedPatch(checked))}
      />
      {value.alreadyStarted && (
        <UsedBeforeField
          value={value.usedBefore}
          max={usedMax}
          onChange={(usedBefore) => onChange({ usedBefore })}
        />
      )}
    </div>
  );
}
