import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { Field } from './field';
import { FormAlert } from './form-alert';
import { Input } from './input';
import { isolateLtr } from './ltr';

const CODES = t.common.phoneErrors.missing_country_code; // «… مثلًا +966 أو +20»

describe('isolateLtr (docs/07 §6 phone error, §14.4)', () => {
  it('wraps every country code in its own <bdi dir=ltr>, text unchanged', () => {
    const { container } = render(<p>{isolateLtr(CODES)}</p>);
    const islands = [...container.querySelectorAll('bdi[dir=ltr]')].map((b) => b.textContent);
    expect(islands).toEqual(['+966', '+20']);
    expect(container.textContent).toBe(CODES);
  });

  it('leaves text without codes as plain text', () => {
    const { container } = render(<p>{isolateLtr(t.common.required)}</p>);
    expect(container.querySelector('bdi')).toBeNull();
    expect(container.textContent).toBe(t.common.required);
  });

  it('field errors and form alerts render codes as LTR islands', () => {
    render(
      <>
        <Field label={t.guardians.phone} error={CODES}>
          {(p) => <Input {...p} />}
        </Field>
        <FormAlert>{CODES}</FormAlert>
      </>,
    );
    for (const alert of screen.getAllByRole('alert')) {
      expect(alert.textContent).toBe(CODES);
      expect(alert.querySelector('bdi[dir=ltr]')?.textContent).toBe('+966');
    }
  });
});
