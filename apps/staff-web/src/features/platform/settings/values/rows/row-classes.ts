import { cn } from '@/lib/utils';

// One look for every row of «القيم» (about 52px, two lines at most; docs/26b §2).

export const rowClass = (dirty: boolean): string => cn('border-b border-rule align-top last:border-b-0', dirty && 'bg-lapis-wash');

/** The row header; a dirty row gets the green inline-start rule (never saffron: that means «دورك»). */
export const headClass = (dirty: boolean): string =>
  cn('max-w-[340px] py-2.5 pe-4 text-start align-top font-normal', dirty ? 'border-s-[3px] border-s-lapis ps-2.5' : 'ps-1');

export const cellClass = 'py-2.5 pe-4 align-top';
