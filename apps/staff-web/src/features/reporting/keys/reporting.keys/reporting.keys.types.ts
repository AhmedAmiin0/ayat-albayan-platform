export type QueryKeyParts = readonly unknown[];

type None = () => QueryKeyParts;
type One<A> = (a: A) => QueryKeyParts;
type Two<A, B> = (a: A, b: B) => QueryKeyParts;

export interface DashboardRange {
  from: string;
  to: string;
}

export interface DashboardKeys {
  all: readonly ['dashboard'];
  summary: One<DashboardRange>;
  work: None;
}

export interface ReportKeys {
  all: readonly ['reports'];
  students: readonly ['reports', 'student'];
  form: One<string>;
  student: Two<string, number>;
  pending: None;
  link: One<string>;
}

export interface ActivityKeys {
  all: readonly ['activity'];
  list: (search: unknown, scope?: unknown) => QueryKeyParts;
}
