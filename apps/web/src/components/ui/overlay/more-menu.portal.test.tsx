import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { Dialog } from './dialog';
import { MoreMenu } from './more-menu';

/** An entry that owns its dialog, rendered inside the menu (like «تحقق من التسجيل»). */
function CheckEntry() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        تحقق
      </button>
      {open && (
        <Dialog title="التحقق" onClose={() => setOpen(false)}>
          <input aria-label="رقم الهاتف" />
        </Dialog>
      )}
    </>
  );
}

const more = () => screen.getByRole('button', { name: t.common.more });

describe('MoreMenu: a dialog portaled from an entry keeps its focus (A)', () => {
  it('clicking and typing in the dialog input keeps focus there; Esc returns it to «المزيد»', () => {
    render(
      <MoreMenu>
        <CheckEntry />
      </MoreMenu>,
    );
    fireEvent.click(more());
    fireEvent.click(screen.getByRole('button', { name: 'تحقق' }));
    expect(more().getAttribute('aria-expanded')).toBe('false');
    const input = screen.getByRole('textbox', { name: 'رقم الهاتف' });
    input.focus();
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: '0100' } });
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole('dialog', { name: 'التحقق' })).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(more());
  });

  it('a click in the dialog does not reopen or toggle the menu', () => {
    render(
      <MoreMenu>
        <CheckEntry />
      </MoreMenu>,
    );
    fireEvent.click(more());
    fireEvent.click(screen.getByRole('button', { name: 'تحقق' }));
    fireEvent.click(screen.getByRole('dialog', { name: 'التحقق' }));
    expect(more().getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
