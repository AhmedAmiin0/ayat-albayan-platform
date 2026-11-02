// Arabic count forms without Intl.PluralRules (Hermes lacks it). ar.json keeps one string per form.
export type PluralForm = 'one' | 'two' | 'few' | 'other';

/** 1, 2, 3–10 (by the last two digits), everything else. */
export function pluralForm(n: number): PluralForm {
  if (n === 1) return 'one';
  if (n === 2) return 'two';
  const rest = n % 100;
  return rest >= 3 && rest <= 10 ? 'few' : 'other';
}

/** The ar.json form for n with every `{n}` filled in. */
export function counted(forms: Readonly<Record<PluralForm, string>>, n: number): string {
  return forms[pluralForm(n)].split('{n}').join(String(n));
}
