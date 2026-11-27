import type { ReportPageView } from '@ab/shared';

export interface ReportPageBodyProps {
  view: ReportPageView;
  /** false inside a lesson row (docs/49): the row already says who and when. */
  head?: boolean;
}
