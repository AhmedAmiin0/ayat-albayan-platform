import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { HeadActions } from './head-actions';

const phone = (matches: boolean) =>
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })));

const head = () => (
  <HeadActions
    primary={<button type="button">تسجيل دفعة</button>}
    more={
      <>
        <button type="button">تصدير CSV</button>
        <button type="button">سجل التقارير</button>
      </>
    }
  />
);

describe('HeadActions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('from 640px every action is inline, the primary last (inline-end)', () => {
    render(head());
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['تصدير CSV', 'سجل التقارير', 'تسجيل دفعة']);
  });

  it('on a phone: the primary and «⋯ المزيد»; the secondary actions open under it', () => {
    phone(true);
    render(head());
    expect(screen.getByRole('button', { name: 'تسجيل دفعة' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'تصدير CSV' })).toBeNull();
    const more = screen.getByRole('button', { name: t.common.more });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'تصدير CSV' }));
    expect(screen.queryByRole('button', { name: 'سجل التقارير' })).toBeNull();
  });

  it('on a phone the menu closes on Esc and on a tap outside', () => {
    phone(true);
    render(head());
    const more = screen.getByRole('button', { name: t.common.more });
    fireEvent.click(more);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'تصدير CSV' })).toBeNull();
    fireEvent.click(more);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('button', { name: 'تصدير CSV' })).toBeNull();
  });

  it('names the group when given a label; no «⋯» without secondary actions', () => {
    phone(true);
    render(<HeadActions label="إجراءات سريعة" primary={<button type="button">جديد</button>} />);
    expect(screen.getByRole('group', { name: 'إجراءات سريعة' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.common.more })).toBeNull();
  });
});
