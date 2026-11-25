import type {
  AssistantPayKeys,
  GuardianKeys,
  RecordingKeys,
  RecoveryKeys,
  RoleKeys,
  StudentKeys,
  TeacherKeys,
  UserKeys,
} from './people.keys.types';

const students = ['students'] as const;
const recordings = ['student-recordings'] as const;
const teachers = ['teachers'] as const;
const users = ['users'] as const;
const guardians = ['guardians'] as const;
const roles = ['roles'] as const;
const assistantPay = ['assistant-pay'] as const;

export const studentKeys: StudentKeys = {
  all: students,
  list: (q) => [...students, 'list', q],
  statusCounts: (filters) => [...students, 'status-counts', filters],
  detail: (id) => [...students, id],
  teacherOptions: () => [...students, 'teacher-options'],
};

export const recordingKeys: RecordingKeys = {
  all: recordings,
  page: ({ studentId, filters, page, pageSize }) => [
    ...recordings,
    studentId,
    filters,
    page,
    pageSize,
  ],
  recordedLessonIds: (studentId) => [...recordings, studentId, 'recorded-lesson-ids'],
};

export const teacherKeys: TeacherKeys = {
  all: teachers,
  list: ({ page, sort, filters }) => [...teachers, 'list', page, sort, filters],
  detail: (id) => [...teachers, id],
  availability: (id) => [...teachers, id, 'availability'],
  timeOff: (id) => [...teachers, id, 'time-off'],
  me: () => [...teachers, 'me'],
  myStudents: (kind) => [...teachers, 'me', 'students', kind],
};

export const userKeys: UserKeys = {
  all: users,
  list: (view) => [...users, 'list', view],
  roleOptions: () => [...users, 'role-options'],
  candidates: (kind, q) => [...users, 'candidates', kind, q],
  detail: (id) => [...users, 'detail', id],
};

export const guardianKeys: GuardianKeys = {
  all: guardians,
  detail: (id) => [...guardians, id],
};

export const roleKeys: RoleKeys = {
  all: roles,
  list: () => [...roles, 'list'],
  staffUsers: () => [...roles, 'users'],
};

export const assistantPayKeys: AssistantPayKeys = {
  all: assistantPay,
  assistants: () => [...assistantPay, 'assistants'],
  commissions: (filters) => [...assistantPay, 'commissions', filters],
  statements: (filters) => [...assistantPay, 'statements', filters],
  broughtBy: (studentId) => [...assistantPay, 'brought-by', studentId],
};

// The reset link's session is read once per visit (gcTime 0); no people write may refetch it.
export const recoveryKeys: RecoveryKeys = {
  session: () => ['set-password', 'recovery-session'],
};
