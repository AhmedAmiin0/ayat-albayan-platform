import { roleClaim } from './role-claim';

// docs/36 z9: the claims part is read through jsonOf(supabaseClaimsSchema).

const part = (text: string): string =>
  btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test.each([
  ['a non-string user_role', JSON.stringify({ user_role: 5 })],
  ['an array', '["admin"]'],
  ['JSON null', 'null'],
  ['not JSON', '{user_role:admin}'],
])('%s is no role', (_name, text) => {
  expect(roleClaim(`h.${part(text)}.s`)).toBeNull();
});

test('a token without a claims part is no role', () => {
  expect(roleClaim('no-dots')).toBeNull();
});

test('other claims of any type do not hide user_role', () => {
  const text = JSON.stringify({ sub: 7, email: [], user_role: 'teacher' });
  expect(roleClaim(`h.${part(text)}.s`)).toBe('teacher');
});
