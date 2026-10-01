/**
 * Under 640px the students table becomes stacked rows (docs/07 §6 Data table): name + status,
 * code / program / teacher, guardian + phone. CSS only, on a wrapper around the shared DataTable,
 * with per-column `order` in the column meta; td's become flex items, so no DOM is duplicated.
 * TODO(integrator): move into DataTable as a `stacked` prop once a second list needs it.
 */
export const stackedRows = [
  // The head stays in the a11y tree (column names; journey 6 counts its row on Pixel 7).
  'max-sm:[&_table]:block max-sm:[&_tbody]:block max-sm:[&_thead]:sr-only',
  'max-sm:[&_tbody_tr]:flex max-sm:[&_tbody_tr]:flex-wrap max-sm:[&_tbody_tr]:items-center',
  'max-sm:[&_tbody_tr]:gap-x-2.5 max-sm:[&_tbody_tr]:gap-y-0.5 max-sm:[&_tbody_tr]:border-b max-sm:[&_tbody_tr]:border-rule max-sm:[&_tbody_tr]:py-3',
  'max-sm:[&_td]:border-0 max-sm:[&_td]:p-0 max-sm:[&_td]:whitespace-normal',
].join(' ');

/** Column meta classes for the stacked layout, by column. */
export const stacked = {
  name: 'max-sm:order-1 max-sm:flex-[1_1_60%] max-sm:text-base',
  // 60% + 35% leaves no room for the code: it starts line 2.
  status: 'max-sm:order-2 max-sm:basis-[35%] max-sm:text-end',
  code: 'max-sm:order-3 max-sm:text-ink-3',
  program: 'max-sm:order-4 max-sm:text-ink-3',
  teacher: 'max-sm:order-5 max-sm:text-ink-3',
  guardian: 'max-sm:order-6 max-sm:flex max-sm:basis-full max-sm:gap-x-2.5 max-sm:text-xs max-sm:text-ink-2',
  actions: 'max-sm:hidden',
};
