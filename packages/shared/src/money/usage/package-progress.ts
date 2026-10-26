import { counted, type PluralForm } from '../../format/plural.js';

// docs/07 §6: one pure function for the package line on the students hamish, the mobile card, the
// guardian portal and the PDF footer. Strings come from ar.json `subscriptions.progress` (passed in:
// @ab/shared source cannot import ar.json).

type Forms = Readonly<Record<PluralForm, string>>;

export interface PackageProgressForms {
  /** «الباقة خلصت» (= enums.subscriptionStatus.expired). */
  zero: string;
  /** «فاضل حلقة» · «فاضل حلقتين» · «فاضل {n} حلقات» (3–10) · «فاضل {n} حلقة» (11+). */
  left: Forms;
  /** Attended past the package (negative remaining): «حضر {n} حلقات زيادة عن الباقة». */
  over: Forms;
}

export interface PackageProgress {
  used: number;
  total: number;
  remaining: number;
  remainingLabel: string;
  /** act (saffron «دورك») at or under the R-SUB-02 threshold, including used up / over. */
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
