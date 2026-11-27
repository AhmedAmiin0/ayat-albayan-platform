export interface MoveReasonProps {
  value: string;
  onChange: (value: string) => void;
  /** Default move-reason label; the family's or the answer's own words otherwise. */
  label?: string;
  /** Default: the teacher reads it in the student file. */
  hint?: string;
  placeholder?: string;
}
