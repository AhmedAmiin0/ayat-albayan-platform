/** An endpoint's page query as it stands: default size, maximum size, last page if capped. */
export interface PageGoldenSpec {
  size: number;
  max: number;
  lastPage?: number;
}

export interface PageIssue {
  code: string;
  path: PropertyKey[];
}

/** What a page query answers for one payload: the page it read, or the issues. */
export type PageOutcome = { page: number; pageSize: number } | { issues: PageIssue[] };

export interface PageGoldenCase {
  input: Record<string, string>;
  expected: PageOutcome;
}
