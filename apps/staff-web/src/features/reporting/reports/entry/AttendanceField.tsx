import { ATTENDANCES, type Attendance } from '@ab/shared';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { t } from '@/lib/i18n/i18n';

export interface AttendanceFieldProps {
  name: string;
  value: Attendance | null;
  onChange: (value: Attendance) => void;
  disabled?: boolean;
  /** missing_attendance from the last submit attempt. */
  invalid?: boolean;
}

const OPTIONS = ATTENDANCES.map((a) => ({ value: a, label: t.enums.attendance[a] }));

/** «الحضور *» per student (R-REP-02): four native radios as chips; it decides the lesson outcome. */
export function AttendanceField({ name, value, onChange, disabled, invalid }: AttendanceFieldProps) {
  return (
    <RadioChips
      name={name}
      legend={t.reports.attendance}
      options={OPTIONS}
      value={value}
      onChange={onChange}
      disabled={disabled}
      invalid={invalid}
      required
    />
  );
}
