/** The page fields a detail request may combine (GET /threads/:phone). */
interface PageModeInput {
  before?: string | undefined;
  before_id?: string | undefined;
  around?: string | undefined;
  after?: string | undefined;
}

type Rule = [broken: (q: PageModeInput) => boolean, code: string];

const RULES: readonly Rule[] = [
  [(q) => q.before_id !== undefined && q.before === undefined, 'before_id_needs_before'],
  [(q) => q.around !== undefined && q.before !== undefined, 'around_excludes_before'],
  [(q) => q.around !== undefined && q.after !== undefined, 'around_excludes_after'],
];

/**
 * One page per request (docs/37): `before_id` needs `before`; `around` (the window around a
 * message) excludes `before`, `before_id` and `after`. The broken rules' codes; none when valid.
 */
export const onePageMode = (q: PageModeInput): string[] =>
  RULES.filter(([broken]) => broken(q)).map(([, code]) => code);
