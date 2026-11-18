/** One page of a list endpoint (`?page&pageSize`, R-NFR-08): the rows and the full count. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

