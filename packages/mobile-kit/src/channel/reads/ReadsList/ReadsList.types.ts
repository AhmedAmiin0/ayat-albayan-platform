export interface ReadsRow {
  key: string;
  line: string;
  /** When she read it; '' for those who have not. */
  time: string;
}

export interface ReadsListProps {
  title: string;
  rows: readonly ReadsRow[];
}
