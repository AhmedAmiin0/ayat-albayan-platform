import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { tile } from '@ab/web-kit/testing';
import { KickButton } from './KickButton';

describe('KickButton', () => {
  it('names the person and asks to remove that tile', () => {
    const ali = tile({ key: 'ali', name: 'Ali' });
    const onAsk = vi.fn();
    render(<KickButton tile={ali} onAsk={onAsk} />);
    fireEvent.click(
      screen.getByRole('button', { name: t.classroom.kick.actionOf.replace('{name}', 'Ali') }),
    );
    expect(onAsk).toHaveBeenCalledWith(ali);
  });
});
