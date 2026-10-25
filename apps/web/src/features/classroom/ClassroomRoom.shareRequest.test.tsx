import { fireEvent, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { openRoom } from './board/board-fixture';
import { fakeClient, tile, type FakeClient } from './fake-client';
import { decodeShare, encodeShare, SHARE_TOPIC, type ShareMessage } from './share/share-messages';

const apiSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<typeof import('@/lib/http/api')>()), apiSend }));

const S = t.classroom.shareRequest;
const guestRoom = () => fakeClient({ shareAllowed: false, tiles: [tile({ key: 'me', isLocal: true, role: 'guest' }), tile({ key: 't', role: 'teacher' })] });
const sent = (c: FakeClient) => c.sendData.mock.calls.filter(([, o]) => o.topic === SHARE_TOPIC).map(([b, o]) => ({ msg: decodeShare(b), to: o.to }));
const deliver = (c: FakeClient, msg: ShareMessage, from: { identity: string; role: 'guest' | 'teacher' }) =>
  act(() => c.receive({ bytes: encodeShare(msg), topic: SHARE_TOPIC, from }));

describe('«اطلب مشاركة الشاشة»', () => {
  afterEach(() => apiSend.mockClear());

  it('a guest asks instead of a share button that would fail; «سماح» arrives as the permission', async () => {
    const c = openRoom('guest', guestRoom());
    expect(screen.queryByRole('button', { name: t.classroom.shareOn })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: S.request }));
    expect(sent(c)).toEqual([{ msg: { t: 'request', what: 'screen' }, to: undefined }]);
    expect((screen.getByRole('button', { name: S.pending }) as HTMLButtonElement).disabled).toBe(true);
    act(() => c.push({ shareAllowed: true }));
    expect(await screen.findByText(S.allowed)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.classroom.shareOn })).toBeTruthy();
  });

  it('a staff «رفض» tells the guest; a forged one from another guest does not', async () => {
    const c = openRoom('guest', guestRoom());
    fireEvent.click(screen.getByRole('button', { name: S.request }));
    deliver(c, { t: 'deny', who: 'me', what: 'screen' }, { identity: 'g2', role: 'guest' });
    expect(screen.queryByText(S.denied)).toBeNull();
    deliver(c, { t: 'deny', who: 'me', what: 'screen' }, { identity: 't', role: 'teacher' });
    expect(await screen.findByText(S.denied)).toBeTruthy();
    expect(screen.getByRole('button', { name: S.request })).toBeTruthy();
  });

  it('the teacher sees the request once, «سماح» calls the API, «إيقاف مشاركة» takes it back', async () => {
    const tiles = [tile({ key: 'me', isLocal: true, role: 'teacher' }), tile({ key: 'guest-1', name: 'سهيلة', role: 'guest' })];
    const c = openRoom('teacher', fakeClient({ tiles }));
    deliver(c, { t: 'request', what: 'screen' }, { identity: 'guest-1', role: 'guest' });
    deliver(c, { t: 'request', what: 'screen' }, { identity: 'guest-1', role: 'guest' });
    expect(screen.getAllByText(S.asks.replace('{name}', 'سهيلة'))).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: S.allow }));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/L1/room/participants/guest-1/share', { allow: true });
    act(() => c.push({ tiles: [tiles[0] ?? tile({ key: 'x' }), tile({ key: 'guest-1', name: 'سهيلة', role: 'guest', shareAllowed: true })] }));
    fireEvent.click(await screen.findByRole('button', { name: S.stop.replace('{name}', 'سهيلة') }));
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/lessons/L1/room/participants/guest-1/share', { allow: false });
  });

  it('«رفض» sends share-denied naming the guest and clears the prompt', async () => {
    const tiles = [tile({ key: 'me', isLocal: true, role: 'admin' }), tile({ key: 'guest-1', name: 'سهيلة', role: 'guest' })];
    const c = openRoom('admin', fakeClient({ tiles }));
    deliver(c, { t: 'request', what: 'screen' }, { identity: 'guest-1', role: 'guest' });
    fireEvent.click(screen.getByRole('button', { name: S.deny }));
    expect(sent(c).at(-1)).toEqual({ msg: { t: 'deny', who: 'guest-1', what: 'screen' }, to: undefined });
    await waitFor(() => expect(screen.queryByText(S.asks.replace('{name}', 'سهيلة'))).toBeNull());
    expect(apiSend).not.toHaveBeenCalled();
  });
});

describe('share buttons on phones (no getDisplayMedia)', () => {
  const real = navigator.mediaDevices;
  afterEach(() => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: real }));

  it('neither «شارك الشاشة» nor «اطلب مشاركة الشاشة» is offered', () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {} });
    openRoom('teacher');
    expect(screen.queryByRole('button', { name: t.classroom.shareOn })).toBeNull();
    expect(screen.getByRole('button', { name: t.classroom.camOn })).toBeTruthy();
  });

  it('a guest on a phone gets no request button either', () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {} });
    openRoom('guest', guestRoom());
    expect(screen.queryByRole('button', { name: S.request })).toBeNull();
  });
});
