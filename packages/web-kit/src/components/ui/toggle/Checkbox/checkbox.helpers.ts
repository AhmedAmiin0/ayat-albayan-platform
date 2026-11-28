import { cn } from '@ab/web-kit/lib/utils';

export const labelClass = cn(
  'inline-flex min-h-11 cursor-pointer items-center gap-2.5 py-1 text-sm text-ink',
  'has-disabled:cursor-not-allowed has-disabled:opacity-45',
);
export const boxClass = 'size-5 shrink-0 cursor-pointer accent-lapis-fill disabled:cursor-not-allowed';
