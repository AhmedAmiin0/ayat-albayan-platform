import { avatarTone } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { Avatar } from './avatar';

const photoOf = (name: string) => t.staffPhoto.photoOf.replace('{name}', name);

describe('Avatar (owner 2026-10-28)', () => {
  it('a photo: a round, cover-fitted <img> named «صورة {name}»', () => {
    render(<Avatar name="فاطمة الزهراء" src="https://x.test/a.png" />);
    const img = screen.getByRole('img', { name: photoOf('فاطمة الزهراء') });
    expect(img.getAttribute('src')).toBe('https://x.test/a.png');
    expect(img.className).toContain('object-cover');
    expect(img.parentElement?.className).toContain('rounded-full');
  });

  it('no photo: the initials circle named by the person, ink on the tone', () => {
    render(<Avatar name="الحسن علي" id="t1" />);
    const tile = screen.getByRole('img', { name: 'الحسن علي' });
    expect(tile.textContent).toBe('ح');
    expect(tile.className).toContain('rounded-full');
    expect(tile.className).toContain('text-ink');
    expect(tile.style.backgroundColor).toBe(`var(--avatar-${avatarTone('t1') + 1})`);
  });

  it('Latin names give two upper-case initials', () => {
    render(<Avatar name="sara ahmed" />);
    expect(screen.getByRole('img', { name: 'sara ahmed' }).textContent).toBe('SA');
  });

  it('the same id gives the same tone, whatever the name; no id seeds by the name', () => {
    const { container } = render(
      <>
        <Avatar name="أحمد" id="p-42" />
        <Avatar name="Ahmed" id="p-42" />
        <Avatar name="Omar" />
      </>,
    );
    const [a, b, c] = [...container.querySelectorAll<HTMLElement>('[data-avatar-tone]')];
    expect(a?.dataset.avatarTone).toBe(b?.dataset.avatarTone);
    expect(a?.style.backgroundColor).toBe(b?.style.backgroundColor);
    expect(c?.dataset.avatarTone).toBe(String(avatarTone('Omar') + 1));
  });

  it('a photo that fails to load falls back to the initials', () => {
    const { container } = render(<Avatar name="Sara Ahmed" src="https://x.test/broken.png" />);
    const img = container.querySelector('img');
    if (img) fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Sara Ahmed' }).textContent).toBe('SA');
  });

  it('no letter: the person glyph, hidden when there is no name', () => {
    const { container } = render(<Avatar name="+966 50" />);
    expect(container.querySelector('svg')).not.toBeNull();
    const { container: empty } = render(<Avatar name="" />);
    expect(empty.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('decorative: hidden from assistive tech (the name is beside it)', () => {
    const { container } = render(<Avatar name="Sara" src="https://x.test/a.png" decorative />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('`alt` overrides the accessible name', () => {
    render(<Avatar name="Sara" alt="Preview" />);
    expect(screen.getByRole('img', { name: 'Preview' })).toBeTruthy();
  });

  it.each([
    ['sm', 'size-7'],
    ['md', 'size-9'],
    ['lg', 'size-16'],
    ['xl', 'size-24'],
  ] as const)('size %s is %s, fixed and shrink-0', (size, cls) => {
    render(<Avatar name="Sara" size={size} />);
    const tile = screen.getByRole('img', { name: 'Sara' });
    expect(tile.className).toContain(cls);
    expect(tile.className).toContain('shrink-0');
  });
});
