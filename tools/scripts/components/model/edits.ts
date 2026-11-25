/** A text edit: replace text[start, end) with value. */
export interface TextEdit {
  start: number;
  end: number;
  value: string;
}

/** Applies non-overlapping edits from the end, so earlier offsets stay valid. */
export const applyEdits = (text: string, edits: readonly TextEdit[]): string =>
  edits
    .toSorted((a, b) => b.start - a.start)
    .reduce((out, e) => out.slice(0, e.start) + e.value + out.slice(e.end), text);
