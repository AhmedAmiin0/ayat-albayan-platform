import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToggleChips } from './ToggleChips';

describe('ToggleChips', () => {
  it('marks the selected chips pressed and reports a toggle', () => {
    const onToggle = vi.fn();
    const options = [{ value: 'a', label: 'أ' }, { value: 'b', label: 'ب' }] as const;
    render(<ToggleChips label="مجموعة" options={options} selected={['a']} onToggle={onToggle} />);
    expect(screen.getByRole('group', { name: 'مجموعة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'أ', pressed: true })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ب', pressed: false }));
    expect(onToggle).toHaveBeenCalledWith('b');
  });
});
