import { appRole, roleClaim } from './role-claim';

/** A token-shaped string with this payload (base64url, no padding), unsigned. */
function token(payload: object): string {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `eyJhbGciOiJIUzI1NiJ9.${body}.sig`;
}

test.each([
  ['admin', 'admin'],
  ['teacher', 'teacher'],
  ['guardian', null],
  [null, null],
])('user_role %s → %s', (role, expected) => {
  expect(roleClaim(token({ sub: 'u1', user_role: role }))).toBe(expected);
});

test('base64url payloads with - and _ decode', () => {
  // «?>» encodes to «Pz4» and «??» to «Pz8»: pick a name whose payload needs url-safe chars.
  const raw = token({ sub: 'u1', name: '???>>>~~~', user_role: 'teacher' });
  expect(raw).toMatch(/[-_]/);
  expect(roleClaim(raw)).toBe('teacher');
});

test('garbage is no role', () => {
  expect(roleClaim('')).toBeNull();
  expect(roleClaim('a.%%%.c')).toBeNull();
  expect(roleClaim(`a.${btoa('"just a string"')}.c`)).toBeNull();
});

test('appRole keeps only the two app roles', () => {
  expect(appRole('admin')).toBe('admin');
  expect(appRole('teacher')).toBe('teacher');
  expect(appRole('guardian')).toBeNull();
  expect(appRole(undefined)).toBeNull();
});
