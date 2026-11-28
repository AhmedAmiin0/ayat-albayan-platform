export interface BarListRow {
  key: string;
  label: string;
  value: number;
  /** The printed value, e.g. a formatted amount or «3.3 / 5»; the plain number when absent. */
  valueLabel?: string;
  /** Makes the label a button, e.g. to open the rows behind it or set a filter. */
  onSelect?: () => void;
}

export interface BarListProps {
  /** The list's accessible name. */
  label: string;
  rows: readonly BarListRow[];
  /** The full-bar value, e.g. 5 for a rating; the largest row when absent. */
  max?: number;
  /** Shown instead of the list when there are no rows. */
  empty?: string;
}
