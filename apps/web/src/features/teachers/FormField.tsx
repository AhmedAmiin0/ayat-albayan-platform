import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

/** Same look as <Input> for native selects (no shadcn Select in the repo yet). */
export const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm';

/** Label + control stacked; `id` links the label to the control. */
export function FormField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
