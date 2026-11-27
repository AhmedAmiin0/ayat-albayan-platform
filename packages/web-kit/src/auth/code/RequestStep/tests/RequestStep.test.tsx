import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RequestStep } from '@ab/web-kit/auth/code/RequestStep';

const F = t.familyAuth;
const base = { label: F.phone, onValue: vi.fn(), busy: false };
const submit = () => fireEvent.submit(screen.getByRole('button', { name: F.sendCode }));

describe('RequestStep', () => {
  it('a blank value neither submits nor enables the button', () => {
    const onSubmit = vi.fn();
    render(<RequestStep {...base} kind="tel" value="  " onSubmit={onSubmit} />);
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: F.sendCode }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText(F.phone).getAttribute('type')).toBe('tel');
  });

  it('a value submits, and typing reports the new value', () => {
    const onSubmit = vi.fn();
    const onValue = vi.fn();
    render(
      <RequestStep {...base} kind="username" value="sara" onValue={onValue} onSubmit={onSubmit}>
        <p>links</p>
      </RequestStep>,
    );
    submit();
    expect(onSubmit).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText(F.phone), { target: { value: 'sara.t' } });
    expect(onValue).toHaveBeenCalledWith('sara.t');
    expect(screen.getByLabelText(F.phone).getAttribute('type')).toBe('text');
    expect(screen.getByText('links')).toBeTruthy();
  });

  it('while busy the button says it is sending and the error shows', () => {
    render(<RequestStep {...base} kind="tel" value="5" busy error="bad" onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: F.sending }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('bad')).toBeTruthy();
  });
});
