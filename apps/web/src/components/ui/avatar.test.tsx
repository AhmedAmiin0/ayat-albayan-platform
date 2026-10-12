import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './avatar';

describe('Avatar', () => {
  it('a photo: an <img> with the given text', () => {
    render(<Avatar name="Sara Ahmed" src="https://x.test/a.png" alt="Photo of Sara" />);
    expect(screen.getByRole('img', { name: 'Photo of Sara' }).getAttribute('src')).toBe('https://x.test/a.png');
  });

  it('no photo: the initials, round, on the gold-wash tile', () => {
    render(<Avatar name="Sara Ahmed" alt="Photo of Sara" />);
    const tile = screen.getByRole('img', { name: 'Photo of Sara' });
    expect(tile.textContent).toBe('SA');
    expect(tile.className).toContain('rounded-full');
    expect(tile.className).toContain('bg-gold-wash');
  });

  it('a photo that fails to load falls back to the initials', () => {
    const { container } = render(<Avatar name="Sara Ahmed" src="https://x.test/broken.png" />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('alt')).toBe('');
    if (img) fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('SA');
  });

  it('no name: the person glyph, hidden from assistive tech when decorative', () => {
    const { container } = render(<Avatar name="" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
