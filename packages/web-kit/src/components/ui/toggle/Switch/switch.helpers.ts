import { cn } from '@ab/web-kit/lib/utils';

export const inputClass = cn(
  'peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0',
  'disabled:cursor-not-allowed',
);
export const hitClass = 'relative inline-flex min-h-11 min-w-11 items-center justify-center';
export const trackClass = cn(
  'block h-6 w-11 rounded-full border border-rule-input bg-sunk transition-colors duration-150',
  'peer-checked:border-lapis-fill peer-checked:bg-lapis-fill peer-disabled:opacity-45',
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
  'peer-focus-visible:outline-lapis motion-reduce:transition-none',
);
export const knobClass = cn(
  'pointer-events-none absolute start-0.75 top-1/2 size-4.5 -translate-y-1/2 rounded-full',
  'bg-ink-3 transition-transform duration-150 peer-checked:bg-primary-foreground',
  'rtl:peer-checked:-translate-x-5 ltr:peer-checked:translate-x-5 motion-reduce:transition-none',
);
