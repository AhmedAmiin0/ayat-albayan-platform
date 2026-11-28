import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { aKickController, tile } from '@ab/web-kit/testing';
import { KickDialog } from './KickDialog';

const K = t.classroom.kick;
const ali = tile({ key: 'ali', name: 'Ali' });

describe('KickDialog', () => {
  it('shows nothing with no one to remove and no toast', () => {
    const { container } = render(<KickDialog kick={aKickController()} />);
    expect(container.textContent).toBe('');
  });

  it('asks about the named person and confirms the removal', () => {
    const kick = aKickController({ target: ali });
    render(<KickDialog kick={kick} />);
    expect(screen.getByText(K.title.replace('{name}', 'Ali'))).toBeTruthy();
    expect(screen.getByText(K.body)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: K.confirm }));
    expect(kick.confirm).toHaveBeenCalledOnce();
  });

  it('cancels without removing', () => {
    const kick = aKickController({ target: ali });
    render(<KickDialog kick={kick} />);
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(kick.cancel).toHaveBeenCalled();
    expect(kick.confirm).not.toHaveBeenCalled();
  });

  it('disables the confirm button with the busy words while removing', () => {
    render(<KickDialog kick={aKickController({ target: ali, busy: true })} />);
    const busy = screen.getByRole('button', { name: K.busy });
    expect(busy.hasAttribute('disabled')).toBe(true);
  });

  it('shows the result toast and dismisses it', () => {
    const message = K.done.replace('{name}', 'Ali');
    const kick = aKickController({ toast: { message, tone: 'info' } });
    render(<KickDialog kick={kick} />);
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText(K.body)).toBeNull();
  });
});
