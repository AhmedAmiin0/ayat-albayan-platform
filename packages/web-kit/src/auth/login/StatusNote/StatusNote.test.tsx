import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusNote } from './StatusNote';

describe('StatusNote', () => {
  it('announces its text as a status', () => {
    render(<StatusNote>sent</StatusNote>);
    expect(screen.getByRole('status').textContent).toBe('sent');
  });
});
