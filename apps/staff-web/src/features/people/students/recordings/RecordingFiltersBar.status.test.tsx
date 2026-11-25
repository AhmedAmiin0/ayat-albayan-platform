import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { RecordingFiltersBar } from './RecordingFiltersBar';

const F = t.studentRecordings.filters;

describe('RecordingFiltersBar state filter', () => {
  it('picks a state and shows it as a removable chip', () => {
    const onChange = vi.fn();
    const bar = (value = {}) =>
      <RecordingFiltersBar value={value} onChange={onChange} teachers={[]} />;
    const { rerender } = render(bar());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.table.filter) }));
    fireEvent.change(screen.getByLabelText(F.status), { target: { value: 'failed' } });
    expect(onChange).toHaveBeenCalledWith({ status: 'failed' });
    rerender(bar({ status: 'failed' }));
    const failed = new RegExp(t.studentRecordings.status.failed);
    expect(screen.getAllByText(failed).length).toBeGreaterThan(0);
  });
});
