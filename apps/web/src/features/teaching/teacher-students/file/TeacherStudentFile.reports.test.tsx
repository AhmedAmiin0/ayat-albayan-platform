import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderFile } from './file-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const RECORDING = new RegExp(t.studentRecordings.reportLinkOf.split(' {')[0] ?? '');

describe('TeacherStudentFile ?tab=reports (docs/47)', () => {
  afterEach(() => apiFetch.mockReset());

  it('the history, then the recordings in the same pane; «تسجيل الحلقة» targets its anchor', async () => {
    renderFile({ apiFetch, tab: 'reports' });
    const link = await screen.findByRole('link', { name: RECORDING });
    expect(link.getAttribute('href')).toBe('/teacher/students/s-1?tab=reports#recording-l-9');
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('heading', { name: t.studentRecordings.title })).toBeTruthy();
    expect(await screen.findByText('أبرار', { selector: '#recording-l-9 *' })).toBeTruthy();
    expect(screen.queryByRole('table', { name: t.teacherFile.upcoming })).toBeNull();
    const tabs = screen.getAllByRole('tab').map((x) => x.getAttribute('aria-selected'));
    expect(tabs).toEqual(['false', 'true']);
  });
});
