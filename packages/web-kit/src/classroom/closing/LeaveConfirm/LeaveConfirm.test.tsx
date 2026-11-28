import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LeaveConfirm } from './LeaveConfirm';

const A = t.mobileRoom.leaveAsk;

function confirm() {
  const onLeave = vi.fn();
  const onStay = vi.fn();
  render(<LeaveConfirm onLeave={onLeave} onStay={onStay} />);
  return { onLeave, onStay };
}

describe('LeaveConfirm', () => {
  it('asks before leaving and says one may come back', () => {
    confirm();
    expect(screen.getByText(A.title)).toBeTruthy();
    expect(screen.getByText(A.body)).toBeTruthy();
  });

  it('leaves on the leave button', () => {
    const { onLeave, onStay } = confirm();
    fireEvent.click(screen.getByRole('button', { name: t.mobileRoom.controls.leave }));
    expect(onLeave).toHaveBeenCalledOnce();
    expect(onStay).not.toHaveBeenCalled();
  });

  it('stays on the stay button', () => {
    const { onLeave, onStay } = confirm();
    fireEvent.click(screen.getByRole('button', { name: A.stay }));
    expect(onStay).toHaveBeenCalled();
    expect(onLeave).not.toHaveBeenCalled();
  });
});
