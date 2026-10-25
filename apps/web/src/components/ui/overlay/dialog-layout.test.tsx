import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { Button } from '../form/button';
import { Dialog, type DialogProps } from './dialog';
import { asideLayout, compactLayout, pickLayout, sheetLayout } from './dialog-classes';

type Opts = Pick<DialogProps, 'compact' | 'layout' | 'wide' | 'className'>;

function open(opts: Opts = {}) {
  render(
    <Dialog title={t.students.mergeTitle} onClose={() => undefined} actions={<Button>{t.students.merge}</Button>} {...opts}>
      <input aria-label={t.students.name} />
    </Dialog>,
  );
  const dialog = screen.getByRole('dialog');
  return { dialog, cls: dialog.className.split(' ') };
}

describe('pickLayout', () => {
  it('a form is an aside, layout=center the card, compact wins over both', () => {
    expect(pickLayout({})).toBe(asideLayout);
    expect(pickLayout({ layout: 'aside' })).toBe(asideLayout);
    expect(pickLayout({ layout: 'center' })).toBe(sheetLayout);
    expect(pickLayout({ compact: true, layout: 'aside' })).toBe(compactLayout);
    expect(pickLayout({ wide: true }).panel).toContain('sm:max-w-[720px]');
    expect(pickLayout({ layout: 'center', wide: true })).toBe(sheetLayout);
  });
});

describe('Dialog layouts from 640px', () => {
  it('a form (default): a full-height aside at the inline-end that slides in', () => {
    const { dialog, cls } = open();
    for (const c of ['h-dvh', 'animate-drawer-in', 'sm:max-w-[520px]', 'sm:border-s', 'sm:rounded-none', 'bg-card']) {
      expect(cls).toContain(c);
    }
    expect(cls).not.toContain('mx-auto');
    expect(cls).not.toContain('sm:animate-pop-in');
    expect(dialog.parentElement?.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'justify-end']));
    // Title row on top, only the body scrolls, the actions a bar at the bottom.
    expect(dialog.firstElementChild?.className).toContain('sm:border-b');
    expect(screen.getByLabelText(t.students.name).parentElement?.className).toContain('overflow-y-auto');
    const footer = dialog.querySelector('[data-dialog-footer]');
    expect(dialog.lastElementChild).toBe(footer);
    expect(footer?.className.split(' ')).toEqual(expect.arrayContaining(['mt-0', 'bg-card', 'border-t']));
    // Phones keep the full-screen sheet.
    expect(cls).toEqual(expect.arrayContaining(['max-sm:max-w-none', 'max-sm:animate-fade-up', 'max-sm:border-0']));
  });

  it('a caller max-w does not narrow the aside from 640px', () => {
    const { cls } = open({ className: 'max-w-[640px]' });
    expect(cls).toContain('max-w-[640px]');
    expect(cls).toContain('sm:max-w-[520px]');
  });

  it('wide: a 720px aside', () => {
    const { cls } = open({ wide: true });
    expect(cls).toContain('sm:max-w-[720px]');
    expect(cls).not.toContain('sm:max-w-[520px]');
  });

  it('layout=center: the floating card, capped at the viewport, pops in', () => {
    const { dialog, cls } = open({ layout: 'center' });
    expect(cls).toEqual(expect.arrayContaining(['mx-auto', 'sm:max-h-[calc(100dvh-3rem)]', 'sm:animate-pop-in']));
    expect(cls).not.toContain('animate-drawer-in');
    expect(dialog.parentElement?.className).toContain('sm:place-items-center');
    // Phones: still the full-screen sheet.
    expect(cls).toContain('max-sm:h-dvh');
  });

  it('compact (a confirm, no fields): the floating card everywhere, even with layout=aside', () => {
    const { dialog, cls } = open({ compact: true, layout: 'aside' });
    expect(cls).toContain('max-h-[calc(100dvh-1.5rem)]');
    expect(cls).toContain('animate-pop-in');
    expect(dialog.className).not.toContain('h-dvh');
    expect(dialog.className).not.toContain('max-sm:');
    expect(dialog.className).not.toContain('drawer');
    expect(dialog.parentElement?.className.split(' ')).toContain('p-3');
    expect(dialog.querySelector('[data-dialog-header]')?.className).not.toContain('border-b');
    // Actions still stack full-width, primary on top.
    expect(screen.getByRole('button', { name: t.students.merge }).parentElement?.className).toContain('flex-col-reverse');
  });
});
