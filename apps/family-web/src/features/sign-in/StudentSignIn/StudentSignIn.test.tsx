import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { StudentSignIn } from './StudentSignIn';

vi.mock('@ab/web-kit', async (orig) => {
  const real = await orig<object>();
  const ResetFlow = ({ mode, onDone }: { mode: string; onDone: (ok: boolean) => void }) => (
    <div>
      <p>{`reset ${mode}`}</p>
      <button type="button" onClick={() => onDone(true)}>
        saved
      </button>
      <button type="button" onClick={() => onDone(false)}>
        back
      </button>
    </div>
  );
  return { ...real, ResetFlow };
});
vi.mock('@/features/sign-in/StudentPasswordForm', () => ({
  StudentPasswordForm: ({ children }: { children?: ReactNode }) => <form>{children}</form>,
}));

const A = t.familyAuth;

describe('StudentSignIn', () => {
  it('codes on: the first-time and forgot links open their reset flows', () => {
    render(<StudentSignIn codes />);
    fireEvent.click(screen.getByRole('button', { name: A.firstTime }));
    expect(screen.getByText('reset firstTime')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    fireEvent.click(screen.getByRole('button', { name: A.forgot }));
    expect(screen.getByText('reset forgot')).toBeTruthy();
  });

  it('a saved password comes back to the form with a note', () => {
    render(<StudentSignIn codes />);
    fireEvent.click(screen.getByRole('button', { name: A.forgot }));
    fireEvent.click(screen.getByRole('button', { name: 'saved' }));
    expect(screen.getByText(A.passwordSaved)).toBeTruthy();
  });

  it('a reset left unsaved comes back with no note', () => {
    render(<StudentSignIn codes />);
    fireEvent.click(screen.getByRole('button', { name: A.firstTime }));
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.queryByText(A.passwordSaved)).toBeNull();
    expect(screen.getByRole('button', { name: A.firstTime })).toBeTruthy();
  });

  it('codes off: no reset links', () => {
    render(<StudentSignIn codes={false} />);
    expect(screen.queryByRole('button', { name: A.firstTime })).toBeNull();
    expect(screen.queryByRole('button', { name: A.forgot })).toBeNull();
  });
});
