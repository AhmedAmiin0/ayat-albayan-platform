import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Route } from '@/routes/teacher/reports.$studentId';

interface Ctx {
  params: { studentId: string };
  location: { hash: string };
}
type BeforeLoad = (ctx: Ctx) => void;
const beforeLoad = Route.options.beforeLoad as unknown as BeforeLoad;

function thrownBy(hash: string): unknown {
  try {
    beforeLoad({ params: { studentId: 's-1' }, location: { hash } });
  } catch (e) {
    return e;
  }
  return null;
}

describe('/teacher/reports/$studentId → the student file (docs/47)', () => {
  it('opens «التقارير» of the same student, keeping a #recording-<id> hash', () => {
    const thrown = thrownBy('recording-l-9');
    expect(isRedirect(thrown)).toBe(true);
    expect(isRedirect(thrown) && thrown.options).toMatchObject({
      to: '/teacher/students/$studentId',
      params: { studentId: 's-1' },
      search: { tab: 'reports' },
      hash: 'recording-l-9',
    });
  });

  it('no hash: none added', () => {
    const thrown = thrownBy('');
    expect(isRedirect(thrown) && thrown.options.hash).toBe('');
  });
});
