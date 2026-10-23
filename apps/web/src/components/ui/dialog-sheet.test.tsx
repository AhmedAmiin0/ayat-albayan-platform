import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { Button } from './button';
import { Dialog } from './dialog';
import { bottomSheetLayout, pickLayout, sheetLayout } from './dialog-classes';

describe('Dialog layout="sheet"', () => {
  it('is picked only by layout=sheet; compact still wins', () => {
    expect(pickLayout({ layout: 'sheet' })).toBe(bottomSheetLayout);
    expect(pickLayout({ layout: 'sheet', compact: true })).not.toBe(bottomSheetLayout);
    expect(pickLayout({ layout: 'center' })).toBe(sheetLayout);
  });

  it('phones: a bottom sheet with rounded top corners, capped in height; the body scrolls', () => {
    render(
      <Dialog layout="sheet" title={t.students.mergeTitle} onClose={() => undefined} actions={<Button>{t.students.merge}</Button>}>
        <input aria-label={t.students.name} />
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    const cls = dialog.className.split(' ');
    expect(cls).toEqual(expect.arrayContaining(['max-sm:max-h-[85dvh]', 'max-sm:rounded-t-lg', 'max-sm:rounded-b-none']));
    expect(cls).not.toContain('max-sm:h-dvh');
    expect(dialog.parentElement?.className.split(' ')).toEqual(expect.arrayContaining(['flex-col', 'justify-end']));
    expect(screen.getByLabelText(t.students.name).parentElement?.className).toContain('overflow-y-auto');
    // From 640px: the floating card.
    expect(cls).toContain('sm:animate-pop-in');
  });
});
