export interface RowNote {
  text: string;
  tone: 'quiet' | 'link';
}

export interface RowTextProps {
  title: string;
  /** The line under it (time, teacher). */
  line?: string | null;
  notes?: readonly RowNote[];
}
