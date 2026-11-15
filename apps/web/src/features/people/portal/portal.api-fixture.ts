// Test helper (test-only): the portal's API answers by route, for a mocked apiFetch.
import { home, packageView } from './portal.fixtures';

type Route =
  | 'me' | 'lessons' | 'reports' | 'package' | 'attended' | 'absent'
  | 'unread' | 'messages' | 'settings' | 'reportPage';

/** An answer, or one per path (each student its own); an Error is thrown. */
type Answer = object;
export type Answers = Partial<Record<Route, Answer | ((path: string) => Answer)>>;

const ROUTES: [RegExp, Route][] = [
  [/^\/portal\/me$/, 'me'],
  [/\/lessons$/, 'lessons'],
  [/\/reports$/, 'reports'],
  [/\/package$/, 'package'],
  [/\/history\?status=attended/, 'attended'],
  [/\/history\?status=absent/, 'absent'],
  [/\/channel\/unread$/, 'unread'],
  [/\/channel\/messages/, 'messages'],
  [/^\/settings\/public$/, 'settings'],
  [/^\/report-pages\/by-report\//, 'reportPage'],
];

const DEFAULTS: Record<Route, Answer> = {
  me: home(),
  lessons: { lessons: [] },
  reports: { reports: [] },
  package: packageView(),
  attended: { rows: [], next_cursor: null },
  absent: { rows: [], next_cursor: null },
  unread: { unread: 0 },
  messages: { student_name: 'سلمى', messages: [], has_more: false, read_only: false },
  settings: {},
  reportPage: new Error('not mocked'),
};

/** apiFetch's implementation: each route's answer (DEFAULTS unless given). */
export function portalApi(answers: Answers = {}) {
  return async (path: string): Promise<unknown> => {
    const route = ROUTES.find(([pattern]) => pattern.test(path))?.[1];
    if (!route) throw new Error(`unmocked ${path}`);
    const given = answers[route] ?? DEFAULTS[route];
    const answer = typeof given === 'function' ? (given as (p: string) => Answer)(path) : given;
    if (answer instanceof Error) throw answer;
    return answer;
  };
}
