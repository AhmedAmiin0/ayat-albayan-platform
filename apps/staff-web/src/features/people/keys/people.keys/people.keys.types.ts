export type QueryKeyParts = readonly unknown[];

type None = () => QueryKeyParts;
type One<A> = (a: A) => QueryKeyParts;
type Two<A, B> = (a: A, b: B) => QueryKeyParts;

export interface StudentKeys {
  all: readonly ['students'];
  list: One<unknown>;
  statusCounts: One<unknown>;
  detail: One<string>;
  teacherOptions: None;
}

export interface RecordingPageKey {
  studentId: string;
  filters: unknown;
  page: number;
  pageSize: number;
}

export interface RecordingKeys {
  all: readonly ['student-recordings'];
  page: One<RecordingPageKey>;
  recordedLessonIds: One<string>;
}

export interface TeacherKeys {
  all: readonly ['teachers'];
  list: One<{ page: number; sort: unknown; filters: unknown }>;
  detail: One<string>;
  availability: One<string>;
  timeOff: One<string>;
}

export interface UserKeys {
  all: readonly ['users'];
  list: One<unknown>;
  roleOptions: None;
  candidates: Two<string, string>;
  detail: One<string>;
}

export interface GuardianKeys {
  all: readonly ['guardians'];
  detail: One<string>;
}

export interface RoleKeys {
  all: readonly ['roles'];
  list: None;
  staffUsers: None;
}

export interface AssistantPayKeys {
  all: readonly ['assistant-pay'];
  assistants: None;
  commissions: One<unknown>;
  statements: One<unknown>;
  broughtBy: One<string>;
}

export interface RecoveryKeys {
  session: None;
}
