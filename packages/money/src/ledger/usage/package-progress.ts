import { counted, type PluralForm } from '@ab/core';

// docs/07 §6: one pure function for the package line on the students hamish, the mobile card, the
// guardian portal and the PDF footer. Strings come from ar.json `subscriptions.progress` (passed
// in:
// @ab/shared source cannot import ar.json).

type Forms = Readonly<Record<PluralForm, string>>;

export interface PackageProgressForms {
  zero: string;
  left: Forms;
  /** Attended past the package (negative remaining). */
  over: Forms;
}

export interface PackageProgress {
  used: number;
  total: number;
  remaining: number;
  remainingLabel: string;
  /** act at or under the R-SUB-02 threshold, including used up or over. */
  tone: 'act' | 'neutral';
}

export function packageProgress(
  used: number,
  total: number,
  opts: { forms: PackageProgressForms; threshold?: number },
): PackageProgress {
  const remaining = total - used;
  const { forms } = opts;
  const remainingLabel =
    remaining === 0
      ? forms.zero
      : remaining > 0
        ? counted(forms.left, remaining)
        : counted(forms.over, -remaining);
  const tone = remaining <= (opts.threshold ?? 2) ? 'act' : 'neutral';
  return { used, total, remaining, remainingLabel, tone };
}
