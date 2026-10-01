import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SiblingMerge } from './SiblingMerge';

const api = vi.hoisted(() => ({ mergeStudents: vi.fn() }));
vi.mock('./api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

const ME = { id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'active' as const };
const SIB = { id: 's2', code: 'AB-0190', name: 'سهيله', status: 'trial' as const };

const renderMerge = (siblings = [SIB]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SiblingMerge student={ME} siblings={siblings} />
    </QueryClientProvider>,
  );

describe('SiblingMerge (R-STU-03)', () => {
  it('folds the sibling into the open profile: this student is kept', async () => {
    api.mergeStudents.mockResolvedValue({ merge_id: 'm1' });
    renderMerge();
    fireEvent.click(screen.getByRole('button', { name: t.students.mergeIntoThis }));
    fireEvent.click(screen.getByRole('button', { name: t.common.confirm }));
    expect(await screen.findByText(t.students.mergeDone)).toBeTruthy();
    expect(api.mergeStudents).toHaveBeenCalledWith({ keptId: 's1', mergedId: 's2' });
  });

  it('renders nothing without siblings', () => {
    const { container } = renderMerge([]);
    expect(container.textContent).toBe('');
  });
});
