import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChildCard } from './ChildCard';
import { kid, soonLesson } from '@ab/web-kit/portal/portal.fixtures';
import { portalApi } from '@ab/web-kit/portal/portal.api-fixture';
import { renderPortal } from '@ab/web-kit/portal/portal.render';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('ChildCard', () => {
  afterEach(() => apiFetch.mockReset());

  it('name, code and the next lesson; the open button calls back', async () => {
    const onOpen = vi.fn();
    apiFetch.mockImplementation(portalApi({ lessons: { lessons: [soonLesson()] } }));
    renderPortal(<ChildCard student={kid()} money={false} onOpen={onOpen} />);
    expect(screen.getByRole('heading', { name: 'سلمى' })).toBeTruthy();
    expect(screen.getByText(t.portal.code.replace('{code}', 'AB-0201'))).toBeTruthy();
    expect(await screen.findByRole('region', { name: t.portal.nextLesson })).toBeTruthy();
    expect(screen.queryByText(t.portal.lessonsEmpty)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.portal.openChild }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('no lesson ahead: says so; without money the package line is not asked for', async () => {
    apiFetch.mockImplementation(portalApi());
    renderPortal(<ChildCard student={kid()} money={false} onOpen={vi.fn()} />);
    expect(await screen.findByText(t.portal.lessonsEmpty)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalledWith('/portal/students/s1/package');
  });

  it('with money the package line shows', async () => {
    apiFetch.mockImplementation(portalApi());
    renderPortal(<ChildCard student={kid()} money onOpen={vi.fn()} />);
    expect(await screen.findByRole('region', { name: t.portal.packageTab })).toBeTruthy();
  });
});
