import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { tile } from '@ab/web-kit/classroom/room/livekit/fake-client';
import { fakeShare } from '@ab/web-kit/classroom/share/share-fixture';
import { ShareRequestsPanel } from './ShareRequestsPanel';

const S = t.classroom.shareRequest;
const D = t.classroom.boardRequest.draw;
const guest = tile({ key: 'g1', name: 'سهيلة', role: 'guest' });

describe('ShareRequestsPanel', () => {
  it('renders nothing with no request, grant, drawer or notice', () => {
    const { container } = render(<ShareRequestsPanel share={fakeShare()} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the notice as a status that closes', () => {
    const share = fakeShare({ notice: S.denied });
    render(<ShareRequestsPanel share={share} />);
    expect(screen.getByRole('status').textContent).toContain(S.denied);
    fireEvent.click(screen.getByRole('button', { name: t.common.close }));
    expect(share.dismiss).toHaveBeenCalledOnce();
  });

  it('asks about each pending request by name and answers it', () => {
    const p = { tile: guest, what: 'screen' as const };
    const share = fakeShare({ pending: [p] });
    render(<ShareRequestsPanel share={share} />);
    expect(screen.getByRole('alert').textContent).toContain(S.asks.replace('{name}', 'سهيلة'));
    fireEvent.click(screen.getByRole('button', { name: S.allow }));
    fireEvent.click(screen.getByRole('button', { name: S.deny }));
    expect(share.allow).toHaveBeenCalledWith(p);
    expect(share.deny).toHaveBeenCalledWith(p);
  });

  it('stops a granted share and a named drawer', () => {
    const share = fakeShare({ granted: [guest], drawers: [guest] });
    render(<ShareRequestsPanel share={share} />);
    fireEvent.click(screen.getByRole('button', { name: S.stop.replace('{name}', 'سهيلة') }));
    fireEvent.click(screen.getByRole('button', { name: D.stop.replace('{name}', 'سهيلة') }));
    expect(share.revoke).toHaveBeenCalledWith(guest);
    expect(share.revokeDraw).toHaveBeenCalledWith(guest);
  });
});
