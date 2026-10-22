import { driveFolderLink } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { FAKE_FOLDER, FAKE_SHEET, googleStudents } from './google.fixture';
import { renderGoogle } from './google-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.googleSync.students;
const rowOf = async (name: string) => (await screen.findByText(name)).closest('li') as HTMLElement;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('student ↔ folder mapping', () => {
  it('«تأكيد» sends the suggestion ids', async () => {
    renderGoogle({ apiFetch });
    const row = await rowOf('Student One');
    expect(within(row).getByText(s.unmapped)).toBeTruthy();
    expect(within(row).getByText(s.suggested.replace('{name}', 'Student One'))).toBeTruthy();
    apiSend.mockResolvedValue(googleStudents()[0]);
    fireEvent.click(within(row).getByRole('button', { name: t.googleSync.common.confirm }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/students/student-1', { folder_id: FAKE_FOLDER, attendance_sheet_id: FAKE_SHEET }),
    );
  });

  it('«مجلد جديد» sends both null', async () => {
    renderGoogle({ apiFetch });
    const row = await rowOf('Student One');
    apiSend.mockResolvedValue(googleStudents()[0]);
    fireEvent.click(within(row).getByRole('button', { name: s.createNew }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/students/student-1', { folder_id: null, attendance_sheet_id: null }),
    );
  });

  it('a manual link that is not a folder is flagged and nothing is sent; a good one sends its id', async () => {
    renderGoogle({ apiFetch });
    const row = await rowOf('Student One');
    fireEvent.click(within(row).getByRole('button', { name: s.manual }));
    const folder = within(row).getByLabelText(s.folderLink);
    fireEvent.change(folder, { target: { value: 'https://example.test/not-a-folder' } });
    fireEvent.click(within(row).getByRole('button', { name: s.useLink }));
    expect(await within(row).findByText(s.badLink)).toBeTruthy();
    expect(folder.getAttribute('aria-invalid')).toBe('true');
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.change(folder, { target: { value: driveFolderLink(FAKE_FOLDER) } });
    apiSend.mockResolvedValue(googleStudents()[0]);
    fireEvent.click(within(row).getByRole('button', { name: s.useLink }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/students/student-1', { folder_id: FAKE_FOLDER, attendance_sheet_id: null }),
    );
  });

  it('a confirmed student shows its state and «إلغاء التأكيد» sends DELETE', async () => {
    renderGoogle({ apiFetch });
    const row = await rowOf('Student Two');
    expect(within(row).getByText(s.existing)).toBeTruthy();
    apiSend.mockResolvedValue({ ...googleStudents()[1], confirmed_at: null });
    fireEvent.click(within(row).getByRole('button', { name: s.unmap }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/admin/google/students/student-2'));
  });

  it('the search asks the server with the typed text (debounced)', async () => {
    renderGoogle({ apiFetch });
    await rowOf('Student One');
    fireEvent.change(screen.getByRole('searchbox', { name: s.search }), { target: { value: 'AB-0002' } });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/google/students?q=AB-0002'));
    expect(apiFetch).toHaveBeenCalledWith('/admin/google/students?q=');
  });

  it('empty search result', async () => {
    renderGoogle({ apiFetch, routes: [['/admin/google/students', []]] });
    expect(await screen.findByText(s.empty)).toBeTruthy();
  });
});
