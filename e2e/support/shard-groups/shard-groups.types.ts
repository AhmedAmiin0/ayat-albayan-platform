export interface Group {
  project: string;
  file: string;
  tests: number;
}

/** The slice of a Playwright TestCase read here; `_workerHash` is Playwright's internal field. */
export interface TestLike {
  location: { file: string };
  _workerHash?: unknown;
}

export interface ProjectSuiteLike {
  project(): { name: string } | undefined;
  allTests(): TestLike[];
}
