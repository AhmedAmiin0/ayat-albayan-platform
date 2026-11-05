import type { ReportDraft, ReportSubmit, ReportV2Draft, ReportV2Submit } from '@ab/shared';

/** One call through a teacher report link: the token in the path is the whole credential. */
export interface LinkCall {
  token: string;
}

/** The parsed body of each write, by route. */
interface Forms {
  draft: Partial<ReportDraft>;
  submit: ReportSubmit;
  draftV2: Partial<ReportV2Draft>;
  submitV2: ReportV2Submit;
}

/** A write to one report of the link's lesson. */
export type LinkReportCall<K extends keyof Forms> = LinkCall & { reportId: string; form: Forms[K] };
