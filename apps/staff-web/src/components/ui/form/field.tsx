import { useId, type ReactNode } from 'react';
import { Label, RequiredMark } from './label';
import { isolateLtr } from '@/components/ui/display/ltr';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';

/** Spread onto the control: links it to the label, hint and error. */
export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

export interface FieldProps {
  label: string;
  /** Control id; generated when omitted. */
  id?: string;
  hint?: string;
  /** Adds the « *» mark (aria-hidden, beside the label) and aria-required; pair the form with a RequiredLegend. */
  required?: boolean;
  /** Shown under the field (13px cinnabar + struck glyph) and marks the control aria-invalid. */
  error?: string;
  /** Render the control with the wiring: `{(p) => <Input {...p} value=… />}`. */
  children: (control: FieldControlProps) => ReactNode;
}

/** Label + control + hint + error with aria wiring (docs/07 §6, §10). */
export function Field({ label, id, hint, error, required, children }: FieldProps) {
  const auto = useId();
  const controlId = id ?? auto;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');
  const control: FieldControlProps = { id: controlId };
  if (describedBy) control['aria-describedby'] = describedBy;
  if (error) control['aria-invalid'] = true;
  if (required) control['aria-required'] = true;

  return (
    <div className="grid content-start gap-1.5">
      <div className="flex items-baseline">
        <Label htmlFor={controlId}>{label}</Label>
        {required && <RequiredMark />}
      </div>
      {children(control)}
      {hint && (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{isolateLtr(error)}</span>
        </p>
      )}
    </div>
  );
}
