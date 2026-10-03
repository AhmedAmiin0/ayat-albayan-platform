import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { Field } from './field';
import { Input } from './input';
import { Select } from './select';

describe('Field', () => {
  it('labels the control and links hint + error through aria-describedby', () => {
    render(
      <Field label={t.students.code} hint={t.students.meetingLinkHint} error={t.common.required}>
        {(p) => <Input {...p} />}
      </Field>,
    );
    const input = screen.getByLabelText(t.students.code);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
      t.students.meetingLinkHint,
      t.common.required,
    ]);
    expect(screen.getByRole('alert').textContent).toBe(t.common.required);
  });

  it('valid field: no aria-invalid, no describedby, explicit id kept', () => {
    render(
      <Field id="tz" label={t.students.tz}>
        {(p) => (
          <Select {...p}>
            <option>Asia/Riyadh</option>
          </Select>
        )}
      </Field>,
    );
    const select = screen.getByLabelText(t.students.tz);
    expect(select.id).toBe('tz');
    expect(select.hasAttribute('aria-invalid')).toBe(false);
    expect(select.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('Field required', () => {
  it('aria-required on the control; the « *» is aria-hidden beside the label, whose text stays plain', () => {
    render(
      <Field label={t.students.code} required>
        {(p) => <Input {...p} />}
      </Field>,
    );
    const input = screen.getByLabelText(t.students.code);
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(document.querySelector('label')?.textContent).toBe(t.students.code);
    expect(document.querySelector('[aria-hidden="true"]')?.textContent).toBe(' *');
  });
});
