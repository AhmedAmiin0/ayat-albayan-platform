import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollX } from './scroll-x';

describe('ScrollX', () => {
  it('a named, keyboard-focusable region around the scrolling box', () => {
    render(
      <ScrollX label="حسب الشهر">
        <table />
      </ScrollX>,
    );
    const box = screen.getByRole('region', { name: 'حسب الشهر' });
    expect(box.getAttribute('tabindex')).toBe('0');
    expect(box.classList.contains('ab-scroll-x')).toBe(true);
    expect(box.querySelector('table')).not.toBeNull();
  });
});
