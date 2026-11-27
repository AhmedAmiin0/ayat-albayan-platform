import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LinkRow } from './LinkRow';

describe('LinkRow', () => {
  it('one button per link, each running its own handler', () => {
    const first = vi.fn();
    const second = vi.fn();
    render(
      <LinkRow
        links={[
          { label: 'one', onClick: first },
          { label: 'two', onClick: second },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'two' }));
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });
});
