import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { historyRow, kid } from '#/portal/portal.fixtures.ts';
import { portalApi } from '#/portal/portal.api-fixture.ts';
import { renderPortal } from '#/portal/portal.render.tsx';
import { HistoryPanel } from '#/portal/history/HistoryPanel/HistoryPanel.tsx';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('#/lib/http/api/api.ts', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const rows = [historyRow(), historyRow({ lesson_id: 'h2', report_id: null })];

afterEach(() => apiFetch.mockReset());

describe('«ملفات الحلقة» on an attended lesson (board FamFilesWebAttended)', () => {
  it('opens the lesson’s own page beside its sent report', async () => {
    apiFetch.mockImplementation(portalApi({ attended: { rows, next_cursor: null } }));
    const onOpenLesson = vi.fn();
    renderPortal(
      <HistoryPanel student={kid()} status="attended" onOpenReport={vi.fn()} onOpenLesson={onOpenLesson} />,
    );
    const files = await screen.findAllByRole('button', { name: t.lessonFiles.title });
    expect(files).toHaveLength(1);
    fireEvent.click(files[0] as HTMLElement);
    expect(onOpenLesson).toHaveBeenCalledWith('h1');
  });

  it('the staff pages pass no lesson page: no such button', async () => {
    apiFetch.mockImplementation(portalApi({ attended: { rows, next_cursor: null } }));
    renderPortal(<HistoryPanel student={kid()} status="attended" onOpenReport={vi.fn()} />);
    expect(await screen.findAllByRole('button', { name: t.portal.openReport })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: t.lessonFiles.title })).toBeNull();
  });
});
