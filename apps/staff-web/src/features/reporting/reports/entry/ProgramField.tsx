import { PROGRAMS, type Program } from '@ab/catalog';
import { RadioChips } from '@ab/web-kit/components/ui/form/radio-chips';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface ProgramFieldProps {
  name: string;
  value: Program | null;
  onChange: (value: Program) => void;
  disabled?: boolean;
}

const OPTIONS = PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }));

/** Program choice as the report form asks it, prefilled from the student. */
export function ProgramField({ name, value, onChange, disabled }: ProgramFieldProps) {
  return (
    <RadioChips name={name} legend={t.reports.program} options={OPTIONS} value={value} onChange={onChange} disabled={disabled} required />
  );
}
