export interface NoCommissionNoteProps {
  /** The picked first day (YYYY-MM-DD). */
  startsOn: string;
  /** Zero when not asked. */
  usedBefore: number;
  /** Stands in for the package's created_at; default the time the note mounted. */
  now?: Date;
}
