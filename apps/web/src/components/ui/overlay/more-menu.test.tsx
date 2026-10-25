import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { Dialog } from './dialog';
import { MoreMenu } from './more-menu';

/** «المزيد» with one entry that opens a dialog outside the menu, like the sales chat actions. */
function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MoreMenu>
        <button type="button" onClick={() => setOpen(true)}>
          سجّل تحويلًا
        </button>
      </MoreMenu>
      {open && (
        <Dialog title="تحويل" onClose={() => setOpen(false)}>
          <input aria-label="المبلغ" />
        </Dialog>
      )}
    </>
  );
}

const more = () => screen.getByRole('button', { name: t.common.more });

describe('MoreMenu: focus comes back to «المزيد» (m12)', () => {
  it('a pick that opens a dialog, then Esc: focus on «المزيد», not lost on <body>', () => {
    render(<Page />);
    fireEvent.click(more());
    fireEvent.click(screen.getByRole('button', { name: 'سجّل تحويلًا' }));
    expect(more().getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('dialog', { name: 'تحويل' })).toBeTruthy();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(more());
  });

  it('Esc on the open menu closes it and focuses «المزيد»', () => {
    render(<Page />);
    fireEvent.click(more());
    screen.getByRole('button', { name: 'سجّل تحويلًا' }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(more().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(more());
  });
});
