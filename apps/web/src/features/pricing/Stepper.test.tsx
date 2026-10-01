import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { Stepper } from './Stepper';

function renderStepper(value: number) {
  const onChange = vi.fn();
  render(
    <Stepper label={t.pricing.studentsLabel} value={value} min={1} max={20} onChange={onChange} />,
  );
  return onChange;
}

describe('Stepper', () => {
  it('steps by one with أقل / أكثر', () => {
    const onChange = renderStepper(3);
    fireEvent.click(screen.getByRole('button', { name: t.pricing.increase }));
    fireEvent.click(screen.getByRole('button', { name: t.pricing.decrease }));
    expect(onChange.mock.calls).toEqual([[4], [2]]);
  });

  it('disables the button at each bound', () => {
    renderStepper(1);
    expect(screen.getByRole('button', { name: t.pricing.decrease })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByRole('button', { name: t.pricing.increase })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('clamps a typed number and ignores text that is not one', () => {
    const onChange = renderStepper(5);
    const input = screen.getByLabelText(t.pricing.studentsLabel, { selector: 'input' });
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange.mock.calls).toEqual([[20]]);
  });
});
