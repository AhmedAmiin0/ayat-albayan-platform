import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { Button } from './button';
import { Dialog } from './dialog';

function renderDialog(onClose = vi.fn()) {
  render(
    <>
      <button type="button">{t.students.add}</button>
      <Dialog
        title={t.students.duplicateTitle}
        description={t.students.duplicateWarning}
        glyph={{ tone: 'act', shape: 'hollow' }}
        onClose={onClose}
        actions={
          <>
            <Button variant="ghost">{t.common.cancel}</Button>
            <Button>{t.students.merge}</Button>
          </>
        }
      >
        <input aria-label={t.students.name} />
      </Dialog>
    </>,
  );
  return onClose;
}

describe('Dialog', () => {
  it('is a modal named by its title and described by its description', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: t.students.duplicateTitle });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      t.students.duplicateWarning,
    );
  });

  it('focuses the first control (not the close button) and traps Tab', () => {
    renderDialog();
    const first = screen.getByLabelText(t.students.name);
    expect(document.activeElement).toBe(first);
    const last = screen.getByRole('button', { name: t.students.merge });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: t.common.close }));
    fireEvent.keyDown(document.activeElement as Element, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('Esc and the close button call onClose', () => {
    const onClose = renderDialog();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: t.common.close }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('returns focus to the opener when it unmounts', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(
      <Dialog title={t.students.mergeTitle} onClose={() => undefined}>
        <input aria-label={t.students.name} />
      </Dialog>,
    );
    expect(document.activeElement).not.toBe(opener);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('phones: a full-screen sheet without a frame, even when the caller narrows it', () => {
    render(
      <Dialog title={t.students.mergeTitle} onClose={() => undefined} className="max-w-[640px]">
        <input aria-label={t.students.name} />
      </Dialog>,
    );
    const cls = screen.getByRole('dialog').className.split(' ');
    for (const c of ['max-sm:h-dvh', 'w-full', 'max-sm:max-w-none', 'max-sm:rounded-none', 'max-sm:border-0', 'max-sm:shadow-none']) {
      expect(cls).toContain(c);
    }
    expect(cls).toContain('max-w-[640px]');
    expect(screen.getByRole('dialog').parentElement?.className).not.toMatch(/(^| )p-3( |$)/);
    // No footer: the body keeps clear of the home indicator itself.
    expect(screen.getByLabelText(t.students.name).parentElement?.className).toContain('env(safe-area-inset-bottom)');
  });

  it('phones: the title bar stays on top and the actions are a full-width bar at the bottom', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    const header = dialog.querySelector('[data-dialog-header]');
    const footer = dialog.querySelector('[data-dialog-footer]');
    expect(dialog.firstElementChild).toBe(header);
    expect(dialog.lastElementChild).toBe(footer);
    expect(header?.contains(screen.getByRole('button', { name: t.common.close }))).toBe(true);
    expect(header?.className).toContain('shrink-0');
    expect(footer?.className).toContain('shrink-0');
    expect(footer?.className).toContain('max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]');
    // Primary on top on phones: the actions column is reversed.
    expect(screen.getByRole('button', { name: t.students.merge }).parentElement?.className).toContain('flex-col-reverse');
  });
});
