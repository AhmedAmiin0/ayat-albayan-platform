// Test data shaped like apps/api assistant-pay; the rows live in @ab/shared/testing (shared with the web).
export { ASSISTANT, commission, statement, termsRowOf } from '@ab/shared/testing';

export const ALL = ['assistantpay.read', 'assistantpay.write', 'assistantpay.approve'];

/** A mocked apiFetch: /auth/me answers `permissions`, each other path its own body (a function may throw). */
export function routes(permissions: readonly string[], bodies: Record<string, unknown>) {
  return (path: string): Promise<unknown> => {
    if (path === '/auth/me') return Promise.resolve({ permissions });
    const key = Object.keys(bodies).find((k) => path.startsWith(k));
    if (key === undefined) return Promise.reject(new Error(`unexpected ${path}`));
    const body = bodies[key];
    return typeof body === 'function' ? Promise.resolve().then(() => (body as (p: string) => unknown)(path)) : Promise.resolve(body);
  };
}
