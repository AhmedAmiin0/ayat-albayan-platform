import {
  mayLowerOwe,
  offeredOwe,
  offeredRefund,
  oweOptions,
  refundOptions,
  STOP_MONEY_START,
  stopMoney,
  stopRefundLines,
  stopSummaryText,
  type StopMoneyState,
} from '@ab/client-core';
import type { CourseStopPreview, StopRefund } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { useHolds } from '@/core/auth';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { money } from '@/payments';
import { SheetLines } from './SheetLines';

type Set = (patch: Partial<StopMoneyState>) => void;
type Fmt = (n: number) => string;

/** The sheet's money choice (owner 2026-11-06), the same rules as web (@ab/client-core). */
export function useStopMoney(preview: CourseStopPreview | undefined) {
  const [state, setState] = useState<StopMoneyState>(STOP_MONEY_START);
  const holds = useHolds('subscriptions.refund');
  const breakdown = offeredRefund(holds, preview?.refund);
  const mayLower = mayLowerOwe(holds, preview);
  const result = preview ? stopMoney({ state, preview, breakdown }) : null;
  const set: Set = (patch) => setState((s) => ({ ...s, ...patch }));
  const ready = result?.valid === true;
  const problem = result?.problem ?? null;
  const ask = result?.ask ?? {};
  return { state, set, breakdown, result, ready, ask, problem, mayLower };
}
type MoneyView = ReturnType<typeof useStopMoney>;

/** «مبلغ مخصص»: 0 up to the allowed maximum. */
function CustomAmount({ view, max }: { view: MoneyView; max: string }) {
  const s = t.courseActions.stop;
  return (
    <Field
      label={s.customAmount}
      placeholder={s.customHint.replace('{amount}', max)}
      value={view.state.text}
      onChangeText={(text) => view.set({ text })}
      keyboardType="decimal-pad"
      ltr
    />
  );
}

function RefundPart({ view, calc, fmt }: { view: MoneyView; calc: StopRefund; fmt: Fmt }) {
  const s = t.courseActions.stop;
  const custom = view.state.refundChoice === 'custom';
  return (
    <View style={{ gap: 12 }}>
      <SheetLines lines={stopRefundLines(s, calc, fmt)} />
      <FilterPills
        items={refundOptions(s, calc, fmt)}
        value={view.state.refundChoice}
        onChange={(refundChoice) => view.set({ refundChoice })}
        accessibilityLabel={s.refundChoice}
        role="radiogroup"
        wrap
      />
      {custom ? <CustomAmount view={view} max={fmt(calc.paid)} /> : null}
      <SheetLines lines={[s.refundWhere]} />
    </View>
  );
}

function OwePart({
  view,
  preview,
  fmt,
}: {
  view: MoneyView;
  preview: CourseStopPreview;
  fmt: Fmt;
}) {
  const s = t.courseActions.stop;
  const custom = view.state.oweChoice === 'custom';
  return (
    <View style={{ gap: 12 }}>
      <FilterPills
        items={offeredOwe(oweOptions(s, preview.owe, fmt), view.mayLower)}
        value={view.state.oweChoice}
        onChange={(oweChoice) => view.set({ oweChoice })}
        accessibilityLabel={s.oweChoice}
        role="radiogroup"
        wrap
      />
      {custom ? <CustomAmount view={view} max={fmt(preview.owe.price)} /> : null}
    </View>
  );
}

const MODES = ['cancel', 'refund'] as const;

/**
 * «إلغاء فقط» (what the family still owes) / «إلغاء مع استرداد» (the refund amount), then one
 * summary line: the refund and what remains owed (owner 2026-11-06, as on web).
 */
export function StopMoneyChoice({
  preview,
  view,
}: {
  preview: CourseStopPreview;
  view: MoneyView;
}) {
  const s = t.courseActions.stop;
  const fmt = (n: number) => money(n, preview.currency);
  const calc = view.breakdown;
  const labels = { cancel: s.cancelOnly, refund: s.withRefund };
  const modes = MODES.map((value) => ({ value, label: labels[value] }));
  const refunding = calc !== null && view.state.mode === 'refund';
  const summary = view.result ? [stopSummaryText(s, view.result.summary, fmt)] : [];
  const unavailable = preview.refundUnavailable ? [s.refundUnavailable] : [];
  return (
    <View style={{ gap: 12 }}>
      {calc ? (
        <FilterPills
          items={modes}
          value={view.state.mode}
          onChange={(mode) => view.set({ mode })}
          accessibilityLabel={s.choice}
          role="radiogroup"
          wrap
        />
      ) : null}
      <SheetLines lines={unavailable} />
      {refunding ? (
        <RefundPart view={view} calc={calc} fmt={fmt} />
      ) : (
        <OwePart view={view} preview={preview} fmt={fmt} />
      )}
      <SheetLines lines={summary} />
    </View>
  );
}
