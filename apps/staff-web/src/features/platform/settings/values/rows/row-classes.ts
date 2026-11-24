import { cn } from '@ab/web-kit/lib/utils';

// Every row is about 52px with two lines at most (docs/26b §2).

export const rowClass = (dirty: boolean): string => cn('border-b border-rule align-top last:border-b-0', dirty && 'bg-lapis-wash');

/** A dirty row gets the green inline-start rule, never saffron, which means the admin's turn. */
export const headClass = (dirty: boolean): string =>
  cn('max-w-[340px] py-2.5 pe-4 text-start align-top font-normal', dirty ? 'border-s-[3px] border-s-lapis ps-2.5' : 'ps-1');

export const cellClass = 'py-2.5 pe-4 align-top';
