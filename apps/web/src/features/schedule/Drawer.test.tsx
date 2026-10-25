import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { Drawer } from './Drawer';

describe('Drawer (the lesson drawer frame)', () => {
  it('phones: full width and full height, the title bar pinned on top under the notch', () => {
    render(
      <Drawer title={t.lessons.details} onClose={() => undefined}>
        <button type="button">{t.common.save}</button>
      </Drawer>,
    );
    const panel = screen.getByRole('dialog', { name: t.lessons.details });
    for (const c of ['w-full', 'h-dvh', 'inset-y-0', 'overflow-y-auto', 'max-sm:shadow-none']) {
      expect(panel.className.split(' ')).toContain(c);
    }
    const header = panel.firstElementChild;
    expect(header?.className).toContain('sticky');
    expect(header?.className).toContain('env(safe-area-inset-top)');
    expect(header?.contains(screen.getByRole('button', { name: t.common.close }))).toBe(true);
    // The actions sit in the scrolling body, above the home indicator.
    expect(panel.className).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(panel.contains(screen.getByRole('button', { name: t.common.save }))).toBe(true);
  });
});
