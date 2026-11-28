import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { fakeRoom, fakeShare } from '@ab/web-kit/classroom/share/share-fixture';
import { ShareButton } from './ShareButton';

const real = navigator.mediaDevices;
const setDisplayMedia = (value: unknown) =>
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getDisplayMedia: value } });

describe('ShareButton', () => {
  beforeEach(() => setDisplayMedia(() => undefined));
  afterEach(() => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: real }));

  it('renders nothing where the browser cannot share a screen', () => {
    setDisplayMedia(undefined);
    const room = fakeRoom({ shareAllowed: true });
    const { container } = render(<ShareButton room={room} role="teacher" share={fakeShare()} />);
    expect(container.innerHTML).toBe('');
  });

  it('starts a share when allowed and not sharing', () => {
    const room = fakeRoom({ shareAllowed: true });
    render(<ShareButton room={room} role="teacher" share={fakeShare()} />);
    fireEvent.click(screen.getByRole('button', { name: t.classroom.shareOn }));
    expect(room.toggleShare).toHaveBeenCalledOnce();
  });

  it('offers to stop, pressed, while sharing', () => {
    const room = fakeRoom({ shareAllowed: true, shareOn: true });
    render(<ShareButton room={room} role="guest" share={fakeShare()} />);
    const btn = screen.getByRole('button', { name: t.classroom.shareOff });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('gives a guest who may not share the request button instead', () => {
    render(<ShareButton room={fakeRoom()} role="guest" share={fakeShare({ canRequest: true })} />);
    expect(screen.getByRole('button', { name: t.classroom.shareRequest.request })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.classroom.shareOn })).toBeNull();
  });

  it('renders nothing for staff who may not share', () => {
    const { container } = render(<ShareButton room={fakeRoom()} role="teacher" share={fakeShare()} />);
    expect(container.innerHTML).toBe('');
  });
});
