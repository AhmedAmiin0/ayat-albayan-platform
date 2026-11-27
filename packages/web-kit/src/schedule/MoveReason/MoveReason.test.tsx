import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { MoveReason } from './MoveReason';

describe('MoveReason: the free-text reason for a move', () => {
  it('uses the default label and hint, and caps the text at the API limit', () => {
    render(<MoveReason value="" onChange={vi.fn()} />);
    const box = screen.getByLabelText(t.reschedule.reason);
    expect(box.getAttribute('maxlength')).toBe('500');
    expect(screen.getByText(t.reschedule.reasonHint)).toBeTruthy();
  });

  it('shows the caller label, hint and placeholder', () => {
    render(<MoveReason value="" onChange={vi.fn()} label="L" hint="H" placeholder="P" />);
    expect(screen.getByLabelText('L').getAttribute('placeholder')).toBe('P');
    expect(screen.getByText('H')).toBeTruthy();
    expect(screen.queryByText(t.reschedule.reasonHint)).toBeNull();
  });

  it('shows the value and reports each change', () => {
    const onChange = vi.fn();
    render(<MoveReason value="سفر" onChange={onChange} />);
    const box = screen.getByLabelText(t.reschedule.reason);
    expect(box).toHaveProperty('value', 'سفر');
    fireEvent.change(box, { target: { value: 'مرض' } });
    expect(onChange).toHaveBeenCalledWith('مرض');
  });
});
