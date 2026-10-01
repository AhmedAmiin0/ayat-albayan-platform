import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { MergeDialog } from './MergeDialog';

const KEPT = { name: 'سهيلة', code: 'AB-0183' };
const MERGED = { name: 'سهيله' };

describe('MergeDialog (R-STU-03)', () => {
  it('fills mergeConfirm with both names', () => {
    render(<MergeDialog kept={KEPT} merged={MERGED} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const text = t.students.mergeConfirm.replace('{merged}', 'سهيله').replace('{kept}', 'سهيلة (AB-0183)');
    expect(screen.getByRole('dialog', { name: t.students.mergeTitle })).toBeTruthy();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('confirm calls onConfirm; a failure shows the Arabic error and keeps the dialog', async () => {
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    render(<MergeDialog kept={KEPT} merged={MERGED} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: t.common.confirm }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t.common.error));
    fireEvent.click(screen.getByRole('button', { name: t.common.confirm }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
  });

  it('cancel calls onCancel', () => {
    const onCancel = vi.fn();
    render(<MergeDialog kept={KEPT} merged={MERGED} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(onCancel).toHaveBeenCalled();
  });
});
