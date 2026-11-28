import type { ColumnValue } from '../types.ts';

const isScalarText = (v: ColumnValue | undefined): v is string | number | boolean =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

/** A scalar column as text; null, missing, arrays and json objects read as ''. */
export function columnText(v: ColumnValue | undefined): string {
  return isScalarText(v) ? String(v) : '';
}
