/** Which part of a read to show: data first, so a failed refetch keeps the last good page. */
export type ReadView = 'data' | 'error' | 'loading';

interface Read {
  data?: unknown;
  isError: boolean;
}

const failedOrLoading = (read: Read): ReadView => (read.isError ? 'error' : 'loading');

export function readView(read: Read): ReadView {
  if (read.data !== undefined) return 'data';
  return failedOrLoading(read);
}

/** The commission list adds «rows» ahead of an empty page. */
export function listView(rowCount: number, read: Read): ReadView | 'rows' {
  if (rowCount > 0) return 'rows';
  return readView(read);
}
