import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PasswordInput } from './PasswordInput';

// The Arabic UI: a password is an LTR island like the email, eye and end padding on one side.
describe('PasswordInput direction', () => {
  it('sits in a dir=ltr wrapper with its eye toggle', () => {
    render(
      <>
        <label htmlFor="pw">pw</label>
        <PasswordInput id="pw" value="secret" onValue={() => undefined} />
      </>,
    );
    const island = screen.getByLabelText('pw').parentElement;
    expect(island?.getAttribute('dir')).toBe('ltr');
    expect(screen.getByRole('button', { name: t.auth.showPassword }).parentElement).toBe(island);
  });

  it('the eye shows and hides the password; typing reports the value', () => {
    const onValue = vi.fn();
    render(
      <>
        <label htmlFor="pw">pw</label>
        <PasswordInput id="pw" value="secret" onValue={onValue} />
      </>,
    );
    const input = screen.getByLabelText('pw');
    const eye = screen.getByRole('button', { name: t.auth.showPassword });
    expect(input.getAttribute('type')).toBe('password');
    fireEvent.click(eye);
    expect(input.getAttribute('type')).toBe('text');
    expect(eye.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(eye);
    expect(input.getAttribute('type')).toBe('password');
    fireEvent.change(input, { target: { value: 'next' } });
    expect(onValue).toHaveBeenCalledWith('next');
  });
});
