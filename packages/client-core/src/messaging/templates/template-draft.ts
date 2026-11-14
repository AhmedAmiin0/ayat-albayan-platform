import { BODY_SLOTS, type TemplateEditButton } from '@ab/shared';

// The form both apps fill (owner 2026-11-14), pure: the body's {{n}} count, each variable's
// sample, and the preview's params.

/** Highest {{n}} in the body (0 when none), capped at the nine slots a send fills. */
export function bodyVarCount(body: string): number {
  const used = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return Math.min(BODY_SLOTS.length, Math.max(0, ...used));
}

/** params[i] = {{i+1}}: its name (known, else var_n) and its sample for Meta's reviewer. */
export function draftParams(
  body: string,
  samples: readonly string[],
  names: readonly string[] = [],
): { name: string; sample: string }[] {
  return Array.from({ length: bodyVarCount(body) }, (_, i) => ({
    name: names[i] ?? `var_${i + 1}`,
    sample: samples[i]?.trim() ?? '',
  }));
}

/** The preview's params: each {{n}} shows its sample, or stays {{n}} while empty. */
export function previewParams(samples: readonly string[]): Record<string, string> {
  const pair = (s: string, i: number): [string, string][] =>
    (s.trim() ? [[String(i + 1), s.trim()]] : []);
  const filledIn = samples.flatMap(pair);
  return Object.fromEntries(filledIn);
}

/** A shown button as an edit sends it back: links and intents as they were, the text new. */
export function retexted(
  buttons: readonly TemplateEditButton[],
  texts: readonly string[],
): TemplateEditButton[] {
  return buttons.map((b, i) => ({ ...b, text: texts[i] ?? b.text }));
}
