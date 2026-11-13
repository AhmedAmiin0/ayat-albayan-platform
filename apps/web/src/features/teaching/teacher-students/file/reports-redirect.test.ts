import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Route } from '@/routes/teacher/reports.$studentId';
import { Route as IndexRoute } from '@/routes/teacher/reports.index';

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

describe('/teacher/reports/$studentId → the student file (docs/47, docs/49)', () => {
  it('opens the same student\'s file with no tab, keeping a #recording-<id> hash', () => {
    const thrown = thrownBy('recording-l-9');
    expect(isRedirect(thrown)).toBe(true);
    expect(isRedirect(thrown) && thrown.options).toMatchObject({
      to: '/teacher/students/$studentId',
      params: { studentId: 's-1' },
      hash: 'recording-l-9',
    });
  });

  it('no hash: none added', () => {
    const thrown = thrownBy('');
    expect(isRedirect(thrown) && thrown.options.hash).toBe('');
  });

  it('a redirect never carries a ?tab', () => {
    const thrown = thrownBy('');
    expect(isRedirect(thrown) && thrown.options.search).toBeUndefined();
  });
});

describe('/teacher/reports → «الطلاب» (docs/49: no «التقارير» page)', () => {
  it('redirects to /teacher/students with no search', () => {
    const indexLoad = IndexRoute.options.beforeLoad as unknown as () => void;
    let thrown: unknown = null;
    try {
      indexLoad();
    } catch (e) {
      thrown = e;
    }
    expect(isRedirect(thrown)).toBe(true);
    expect(isRedirect(thrown) && thrown.options.to).toBe('/teacher/students');
    expect(isRedirect(thrown) && thrown.options.search).toBeUndefined();
  });
});
