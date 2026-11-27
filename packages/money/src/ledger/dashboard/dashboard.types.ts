/** One list of the work queue: at most the API's WORK_ITEMS items and the total before the cut. */
export interface WorkList<T> {
  total: number;
  items: T[];
}
