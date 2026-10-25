import { PROGRAMS, type Program } from '@ab/shared';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { t } from '@/lib/i18n';

export interface ProgramFieldProps {
  name: string;
  value: Program | null;
  onChange: (value: Program) => void;
  disabled?: boolean;
}

const OPTIONS = PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }));

/** «البرنامج *» as the report form asks it: القرآن الكريم / اللغة العربية / الدراسات الإسلامية, prefilled from the student. */
export function ProgramField({ name, value, onChange, disabled }: ProgramFieldProps) {
  return (
    <RadioChips name={name} legend={t.reports.program} options={OPTIONS} value={value} onChange={onChange} disabled={disabled} required />
  );
}
