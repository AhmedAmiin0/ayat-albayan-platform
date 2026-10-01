/**
 * Students' stacked-row order under 640px (DataTable `stacked`, docs/07 §6): name + status,
 * code / program / teacher, guardian + phone.
 */
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
