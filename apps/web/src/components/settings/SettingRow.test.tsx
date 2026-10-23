import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CheckField } from './CheckField';
import { NumberField } from './NumberField';
import { SettingRow } from './SettingRow';

describe('setting rows', () => {
  it('a number row: label and hint at the start, the control linked to both', () => {
    render(<NumberField label="أسابيع" hint="شرح قصير" value="5" onChange={() => undefined} />);
    const input = screen.getByLabelText('أسابيع');
    expect(input.getAttribute('aria-describedby')).toContain('-hint');
    expect(screen.getByText('شرح قصير')).toBeTruthy();
  });

  it('an on/off row is a checkbox drawn as a switch, named by its label', () => {
    const onChange = vi.fn();
    render(<CheckField label="تذكير" checked={false} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'تذكير' });
    expect(box.className).toContain('peer');
    expect(box.nextElementSibling?.getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('an error is an alert wired to the control; a danger row is marked', () => {
    render(
      <SettingRow label="رقم" error="خطأ" danger>
        {(p) => <input {...p} />}
      </SettingRow>,
    );
    const input = screen.getByLabelText('رقم');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('-error');
    expect(screen.getByRole('alert').textContent).toBe('خطأ');
    expect(document.querySelector('[data-danger="true"]')).toBeTruthy();
  });
});
