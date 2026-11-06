import {
  offeredOwe,
  oweOptions,
  refundOptions,
  stopRefundLines,
  stopSummaryText,
  type StopMoney,
} from '@ab/client-core';
import type { CourseStopPreview, StopRefund } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { moneyText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';
import type { StopMoneyView } from './use-stop-money';

type Fmt = (n: number) => string;

/** «مبلغ مخصص»: 0 up to the allowed maximum (the net paid, or the price). */
function CustomAmount({ view, max }: { view: StopMoneyView; max: string }) {
  const words = t.courseActions.stop;
  return (
    <Field label={words.customAmount} hint={words.customHint.replace('{amount}', max)}>
      {(p) => (
        <Input
          {...p}
          inputMode="decimal"
          value={view.state.text}
          onChange={(e) => view.set({ text: e.target.value })}
        />
      )}
    </Field>
  );
}

/** «إلغاء مع استرداد»: paid, attended × price × rate, then the refund amount to choose. */
function RefundPart({ view, calc, fmt }: { view: StopMoneyView; calc: StopRefund; fmt: Fmt }) {
  const words = t.courseActions.stop;
  const custom = view.state.refundChoice === 'custom';
  return (
    <>
      <ul role="status" className="grid list-disc gap-1 rounded-md bg-sunk px-7 py-2.5 text-sm">
        {stopRefundLines(words, calc, fmt).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <RadioChips
        name="course-stop-refund-amount"
        legend={words.refundChoice}
        options={refundOptions(words, calc, fmt)}
        value={view.state.refundChoice}
        onChange={(refundChoice) => view.set({ refundChoice })}
      />
      {custom && <CustomAmount view={view} max={fmt(calc.paid)} />}
      <p className="text-sm text-ink-2">{words.refundWhere}</p>
    </>
  );
}

interface OweProps {
  view: StopMoneyView;
  preview: CourseStopPreview;
  fmt: Fmt;
}

/** «إلغاء فقط»: what the family still owes. */
function OwePart({ view, preview, fmt }: OweProps) {
  const words = t.courseActions.stop;
  const custom = view.state.oweChoice === 'custom';
  return (
    <>
      <RadioChips
        name="course-stop-owe"
        legend={words.oweChoice}
        options={offeredOwe(oweOptions(words, preview.owe, fmt), view.mayLower)}
        value={view.state.oweChoice}
        onChange={(oweChoice) => view.set({ oweChoice })}
      />
      {custom && <CustomAmount view={view} max={fmt(preview.owe.price)} />}
    </>
  );
}

interface Props {
  preview: CourseStopPreview;
  view: StopMoneyView;
  money: StopMoney;
}

const MODES = ['cancel', 'refund'] as const;

/**
 * The stop sheet's money (owner 2026-11-06, «make me choose what I need»): «إلغاء فقط» /
 * «إلغاء مع استرداد», the option with its computed amount, a custom amount, then ONE line: the
 * refund and what remains owed. The commission is never a choice (a stop never touches it).
 */
export function StopMoneyChoice({ preview, view, money }: Props) {
  const words = t.courseActions.stop;
  const fmt = (n: number) => moneyText(n, preview.currency);
  const calc = view.breakdown;
  const labels = { cancel: words.cancelOnly, refund: words.withRefund };
  const modes = MODES.map((value) => ({ value, label: labels[value] }));
  const refunding = calc !== null && view.state.mode === 'refund';
  return (
    <div className="grid gap-3">
      {calc && (
        <RadioChips
          name="course-stop-refund"
          legend={words.choice}
          options={modes}
          value={view.state.mode}
          onChange={(mode) => view.set({ mode })}
          equal
        />
      )}
      {preview.refundUnavailable && <p className="text-sm text-act">{words.refundUnavailable}</p>}
      {refunding ? (
        <RefundPart view={view} calc={calc} fmt={fmt} />
      ) : (
        <OwePart view={view} preview={preview} fmt={fmt} />
      )}
      <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm font-semibold">
        {stopSummaryText(words, money.summary, fmt)}
      </p>
    </div>
  );
}
