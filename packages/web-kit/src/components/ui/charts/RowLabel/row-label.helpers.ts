import { cn } from '@ab/web-kit/lib/utils';

export const textClass = 'min-w-0 truncate text-start text-sm text-ink';
export const buttonClass = cn(
  textClass,
  'min-h-11 cursor-pointer rounded-sm underline decoration-rule-strong underline-offset-4',
  'hover:text-lapis focus-visible:outline-2 focus-visible:outline-offset-2',
  'focus-visible:outline-lapis',
);
