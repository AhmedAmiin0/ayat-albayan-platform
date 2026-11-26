/** An endpoint's page query: its default size and its maximum size. */
export interface PageGoldenSpec {
  size: number;
  max: number;
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
