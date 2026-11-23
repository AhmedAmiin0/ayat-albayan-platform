import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
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
});
