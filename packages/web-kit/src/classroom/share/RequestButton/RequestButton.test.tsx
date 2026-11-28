import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { fakeShare } from '@ab/web-kit/classroom/share/share-fixture';
import { RequestButton } from './RequestButton';

const S = t.classroom.shareRequest;

describe('RequestButton', () => {
  it('renders nothing for someone who may not ask', () => {
    const { container } = render(<RequestButton share={fakeShare()} what="screen" />);
    expect(container.innerHTML).toBe('');
  });

  it('asks for the given kind when pressed', () => {
    const share = fakeShare({ canRequest: true });
    render(<RequestButton share={share} what="screen" />);
    fireEvent.click(screen.getByRole('button', { name: S.request }));
    expect(share.request).toHaveBeenCalledWith('screen');
  });

  it('is pressed and disabled with the waiting words while the request is pending', () => {
    const mine = { screen: 'idle', draw: 'pending', open: 'idle' } as const;
    render(<RequestButton share={fakeShare({ canRequest: true, mine })} what="draw" />);
    const btn = screen.getByRole<HTMLButtonElement>('button', { name: t.classroom.boardRequest.draw.pending });
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });
});
