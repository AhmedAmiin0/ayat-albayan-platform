/** Angular commit header (CLAUDE.md rule 25): `<type>(<scope>): <subject>`, ≤ 100 characters. */
export const TYPES: readonly string[] = [
  'feat', 'fix', 'perf', 'refactor', 'test', 'docs', 'build', 'ci', 'chore', 'revert', 'style',
];

/** Workspace short names and repo-wide areas; a module inside one is written `api/booking`. */
export const SCOPES: readonly string[] = [
  'api', 'staff-web', 'family-web', 'staff-mobile', 'family-mobile',
  'db', 'shared', 'client-core', 'web-kit', 'mobile-kit', 'core', 'time', 'money', 'schedule',
  'settings', 'catalog', 'i18n', 'config', 'testing', 'e2e', 'tools', 'repo', 'deps',
];

const MAX_HEADER = 100;
const SHAPE = /^([^()\s:]+)\(([^()\s]*)\): (.*)$/s;
const MODULE = /^[a-z0-9][a-z0-9.-]*$/;

interface Parts {
  readonly header: string;
  readonly type: string;
  readonly scope: string;
  readonly subject: string;
}

const knownScope = (scope: string): boolean => {
  const [area = '', ...modules] = scope.split('/');
  return SCOPES.includes(area) && modules.every((m) => MODULE.test(m));
};

const RULES: readonly ((p: Parts) => string | null)[] = [
  (p) => (TYPES.includes(p.type) ? null : `type "${p.type}" is not one of ${TYPES.join(', ')}`),
  (p) => (knownScope(p.scope)
    ? null
    : `scope "${p.scope}" is not a workspace or area: ${SCOPES.join(', ')} (a module: api/booking)`),
  (p) => (p.subject.trim() === p.subject ? null : 'the subject has leading or trailing spaces'),
  (p) => (/^[a-z]/.test(p.subject.trim()) ? null : 'the subject starts lower case (imperative verb)'),
  (p) => (p.subject.endsWith('.') ? 'the subject has a trailing period' : null),
  (p) => (p.header.length <= MAX_HEADER
    ? null
    : `header is ${String(p.header.length)} characters, at most ${String(MAX_HEADER)}`),
];

/** Every way the header breaks the convention; empty when it follows it. */
export function headerProblems(header: string): string[] {
  const match = SHAPE.exec(header);
  if (match === null) return ['the header is not <type>(<scope>): <subject>'];
  const [, type = '', scope = '', subject = ''] = match;
  const parts: Parts = { header, type, scope, subject };
  return RULES.map((rule) => rule(parts)).filter((p): p is string => p !== null);
}
