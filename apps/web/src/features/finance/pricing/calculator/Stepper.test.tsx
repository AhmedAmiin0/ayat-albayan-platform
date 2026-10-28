import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
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

  it('typed={false}: the value is shown, never an input; the buttons carry the given names', () => {
    const onChange = vi.fn();
    const names = { less: t.salesMoney.usedBeforeLess, more: t.salesMoney.usedBeforeMore };
    render(<Stepper label={t.salesMoney.usedBefore} value={2} min={0} max={7} onChange={onChange} stepLabels={names} typed={false} />);
    const group = screen.getByRole('group', { name: t.salesMoney.usedBefore });
    expect(group.querySelector('input')).toBeNull();
    expect(screen.getByLabelText(t.salesMoney.usedBefore, { selector: 'output' }).textContent).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: names.more }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
