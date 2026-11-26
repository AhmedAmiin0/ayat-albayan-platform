import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { StudentPasswordForm } from './StudentPasswordForm';

const form = vi.hoisted(() => ({
  code: '',
  setCode: vi.fn(),
  password: '',
  setPassword: vi.fn(),
  codeProblem: undefined as string | undefined,
  error: null as string | null,
  busy: false,
  ready: false,
  submit: vi.fn(async () => undefined),
}));
vi.mock('@/features/sign-in/use-student-sign-in', () => ({ useStudentSignIn: () => form }));

const submit = () => screen.getByRole('button', { name: t.auth.submit });

beforeEach(() => {
  Object.assign(form, { code: '', codeProblem: undefined, error: null, busy: false, ready: false });
  form.setCode.mockReset();
  form.submit.mockClear();
});

describe('StudentPasswordForm', () => {
  it('nothing typed: the code hint, no alert, submit off', () => {
    render(<StudentPasswordForm />);
    expect(screen.getByText(t.familyAuth.studentUsernameHint)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(submit().hasAttribute('disabled')).toBe(true);
  });

  it('typing the code hands it to the form', () => {
    render(<StudentPasswordForm />);
    const code = screen.getByLabelText(t.familyApp.signIn.studentCode);
    fireEvent.change(code, { target: { value: 'AB-0201' } });
    expect(form.setCode).toHaveBeenCalledWith('AB-0201');
  });

  it('a code off track says so under the field', () => {
    form.codeProblem = t.familyApp.signIn.studentCodeBad;
    render(<StudentPasswordForm />);
    expect(screen.getByText(t.familyApp.signIn.studentCodeBad)).toBeTruthy();
  });

  it('ready: sending the form submits once, without a page load', () => {
    form.ready = true;
    render(<StudentPasswordForm />);
    fireEvent.click(submit());
    expect(form.submit).toHaveBeenCalledTimes(1);
  });

  it('busy: the button says so and is off', () => {
    Object.assign(form, { ready: true, busy: true });
    render(<StudentPasswordForm />);
    const busy = screen.getByRole('button', { name: t.auth.submitting });
    expect(busy.hasAttribute('disabled')).toBe(true);
  });

  it('a failed sign-in shows its error, and the children follow the button', () => {
    form.error = 'خطأ';
    render(
      <StudentPasswordForm>
        <p>links</p>
      </StudentPasswordForm>,
    );
    expect(screen.getByRole('alert').textContent).toContain('خطأ');
    expect(screen.getByText('links')).toBeTruthy();
  });
});
