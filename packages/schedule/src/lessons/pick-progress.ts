import { counted, type PluralForm } from '@ab/core';

type Forms = Readonly<Record<PluralForm, string>>;
export interface PickProgressTexts {
  pickProgress: string;
  daysLeft: Forms;
  pickedTooMany: string;
  daysPicked: Forms;
  removeDays: Forms;
}

/** The progress line for `picked` of `need` days; null once exactly `need` are picked. */
export function pickProgress(
  texts: PickProgressTexts,
  picked: number,
  need: number,
): string | null {
  if (picked === need) return null;
  if (picked < need) {
    return texts.pickProgress
      .replace('{picked}', String(picked))
      .replace('{n}', String(need))
      .replace('{left}', counted(texts.daysLeft, need - picked));
  }
  return texts.pickedTooMany
    .replace('{picked}', counted(texts.daysPicked, picked))
    .replace('{remove}', counted(texts.removeDays, picked - need));
}
