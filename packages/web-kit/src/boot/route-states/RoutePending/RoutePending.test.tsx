import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoutePending } from './RoutePending';

describe('RoutePending', () => {
  it('a busy skeleton, never a blank page', () => {
    render(<RoutePending />);
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
  });
});
