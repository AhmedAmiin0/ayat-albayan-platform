import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ConfirmSwitchDialog, type ConfirmSwitchProps } from './ConfirmSwitchDialog';

function renderDialog(over: Partial<ConfirmSwitchProps> = {}) {
  const onYes = vi.fn();
  const onClose = vi.fn();
  render(
    <ConfirmSwitchDialog title="إيقاف" description="يتوقف الإرسال" yes="نعم، أوقف" onYes={onYes} onClose={onClose} pending={false} failed={false} {...over}>
      <p>تفاصيل</p>
    </ConfirmSwitchDialog>,
  );
  return { onYes, onClose, dialog: screen.getByRole('dialog', { name: 'إيقاف' }) };
}

describe('ConfirmSwitchDialog (a dangerous switch asks first)', () => {
  it('spells out the consequence, cancel has the focus, and each button does its one thing', () => {
    const { onYes, onClose, dialog } = renderDialog();
    expect(within(dialog).getByText('يتوقف الإرسال')).toBeTruthy();
    expect(within(dialog).getByText('تفاصيل')).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.cancel }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onYes).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'نعم، أوقف' }));
    expect(onYes).toHaveBeenCalledTimes(1);
  });

  it('while saving the yes button waits; a failed save stays inside the dialog', () => {
    const { dialog } = renderDialog({ pending: true, failed: true });
    expect(within(dialog).getByRole('button', { name: 'نعم، أوقف' })).toHaveProperty('disabled', true);
    expect(within(dialog).getByText(t.common.error)).toBeTruthy();
  });
});
