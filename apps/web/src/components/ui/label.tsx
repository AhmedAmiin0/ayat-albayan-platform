import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('text-xs font-semibold text-ink-2', className)} {...props} />
));
Label.displayName = 'Label';

/**
 * The « *» after a required label or legend: aria-hidden (aria-required says it to assistive
 * tech), and kept out of the <label> itself so the label text and accessible name stay plain.
 * RequiredLegend explains it.
 */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="font-semibold text-danger">
      {' *'}
    </span>
  );
}

/** «* مطلوب» at the top of a form that has required fields. */
export function RequiredLegend() {
  return <p className="text-xs text-ink-3">{t.common.requiredLegend}</p>;
}
