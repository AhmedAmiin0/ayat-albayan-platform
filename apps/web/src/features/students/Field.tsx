import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

type FieldProps = { id: string; label: string; hint?: string; error?: string; children: ReactNode };

/** Label + control + optional hint / inline error. */
export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Native select styled like <Input/>. */
export const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm';
