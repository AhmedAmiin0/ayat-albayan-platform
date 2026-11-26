import { t } from '@ab/web-kit';
import { TextField } from '@/features/people/students/people-edit/TextField';

interface StudentPhoneFieldProps {
  value: string;
  onValue: (value: string) => void;
  /** The refusal of the last save. */
  error?: string;
}

/** The student's own WhatsApp: optional, E.164, their sign-in number. */
export function StudentPhoneField({ value, onValue, error }: StudentPhoneFieldProps) {
  return (
    <TextField
      label={t.peopleEdit.fields.studentPhone}
      hint={t.peopleEdit.studentPhoneHint}
      value={value}
      inputMode="tel"
      error={error}
      onValue={onValue}
    />
  );
}
