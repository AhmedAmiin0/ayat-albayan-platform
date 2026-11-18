import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalApi, type Answers } from '@ab/web-kit/portal/portal.api-fixture';
import { kid, soonLesson } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { ChildHead } from './ChildHead';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const teacherLine = (name: string) => t.portal.app.lesson.teacher.replace('{name}', name);

function show(answers: Answers, own = false) {
  apiFetch.mockImplementation(portalApi(answers));
  renderAt(<ChildHead student={kid()} own={own} />);
}

beforeEach(() => {
  apiFetch.mockReset();
});

describe('the child’s hero (boards PortalWebHome, PortalWebStudentHome)', () => {
  it('the name is the page’s h1, the code an LTR island in its words', async () => {
    show({});
    expect(await screen.findByRole('heading', { level: 1, name: 'سلمى' })).toBeTruthy();
    const code = screen.getByText('AB-0201');
    expect(code.tagName).toBe('BDI');
    expect(code.parentElement?.textContent).toBe(t.portal.code.replace('{code}', 'AB-0201'));
  });

  it('names the next lesson’s teacher; says nothing when no read names one', async () => {
    show({ lessons: { lessons: [soonLesson()] } });
    expect(await screen.findByText(teacherLine('أبرار'), { exact: false })).toBeTruthy();
  });

  it('no teacher known: no teacher line at all', async () => {
    show({});
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText(teacherLine(''), { exact: false })).toBeNull();
  });

  it('a student’s own home greets them, the name still in the heading', async () => {
    show({}, true);
    const name = t.familyLook.child.greeting.replace('{name}', 'سلمى');
    expect(await screen.findByRole('heading', { level: 1, name })).toBeTruthy();
  });
});
