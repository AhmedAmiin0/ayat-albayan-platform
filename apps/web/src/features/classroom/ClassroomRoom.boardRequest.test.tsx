import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { from, openRoom, sent as boardSent } from './board/board-fixture';
import { fakeClient, tile, type FakeClient } from './fake-client';
import { decodeShare, encodeShare, SHARE_TOPIC, type ShareMessage } from './share/share-messages';

const B = t.classroom.boardRequest;
const S = t.classroom.shareRequest;
const TEACHER = { identity: 't', role: 'teacher' as const };
const GUEST = { identity: 'guest-1', role: 'guest' as const };
const guestRoom = () => fakeClient({ shareAllowed: false, tiles: [tile({ key: 'guest-1', isLocal: true, role: 'guest' }), tile({ key: 't', role: 'teacher' })] });
const teacherRoom = () => fakeClient({ tiles: [tile({ key: 't', isLocal: true, role: 'teacher' }), tile({ key: 'guest-1', name: 'سهيلة', role: 'guest' })] });
const sent = (c: FakeClient) => c.sendData.mock.calls.filter(([, o]) => o.topic === SHARE_TOPIC).map(([b]) => decodeShare(b));
const deliver = (c: FakeClient, msg: ShareMessage, who: { identity: string; role: 'guest' | 'teacher' }) =>
  act(() => c.receive({ bytes: encodeShare(msg), topic: SHARE_TOPIC, from: who }));

describe('«اطلب الكتابة على السبورة» / «اطلب فتح السبورة»', () => {
  it('a guest asks to open a closed board; once the teacher opens it the button goes', () => {
    const c = openRoom('guest', guestRoom());
    fireEvent.click(screen.getByRole('button', { name: B.open.request }));
    expect(sent(c)).toEqual([{ t: 'request', what: 'open' }]);
    expect((screen.getByRole('button', { name: B.open.pending }) as HTMLButtonElement).disabled).toBe(true);
    act(() => from(c, TEACHER)({ t: 'open', open: true }));
    expect(screen.queryByRole('button', { name: B.open.pending })).toBeNull();
    expect(screen.getByText(t.classroom.board.readOnly)).toBeTruthy();
  });

  it('a guest asks to write; the teacher’s «سماح» (allow message) gives them the pen and says so', async () => {
    const c = openRoom('guest', guestRoom());
    act(() => from(c, TEACHER)({ t: 'open', open: true }));
    fireEvent.click(screen.getByRole('button', { name: B.draw.request }));
    expect(sent(c)).toEqual([{ t: 'request', what: 'draw' }]);
    act(() => from(c, TEACHER)({ t: 'allow', who: 'guest-1', allow: true }));
    expect(await screen.findByText(B.draw.allowed)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.classroom.board.pen })).toBeTruthy();
    act(() => from(c, TEACHER)({ t: 'allow', who: 'guest-1', allow: false }));
    expect(screen.getByRole('button', { name: B.draw.request })).toBeTruthy();
  });

  it('a «رفض» of the writing request tells the guest', async () => {
    const c = openRoom('guest', guestRoom());
    act(() => from(c, TEACHER)({ t: 'open', open: true }));
    fireEvent.click(screen.getByRole('button', { name: B.draw.request }));
    deliver(c, { t: 'deny', who: 'guest-1', what: 'draw' }, TEACHER);
    expect(await screen.findByText(B.draw.denied)).toBeTruthy();
  });

  it('the teacher allows writing: one board «allow» message, then «إيقاف كتابة {name}» revokes it', () => {
    const c = openRoom('teacher', teacherRoom());
    deliver(c, { t: 'request', what: 'draw' }, GUEST);
    expect(screen.getByText(B.draw.asks.replace('{name}', 'سهيلة'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: S.allow }));
    expect(boardSent(c).at(-1)?.msg).toEqual({ t: 'allow', who: 'guest-1', allow: true });
    expect(screen.queryByText(B.draw.asks.replace('{name}', 'سهيلة'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: B.draw.stop.replace('{name}', 'سهيلة') }));
    expect(boardSent(c).at(-1)?.msg).toEqual({ t: 'allow', who: 'guest-1', allow: false });
  });

  it('the teacher opens the board from an open request; requests share one prompt list', () => {
    const c = openRoom('teacher', teacherRoom());
    deliver(c, { t: 'request', what: 'open' }, GUEST);
    deliver(c, { t: 'request', what: 'screen' }, GUEST);
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: S.allow })[0] as HTMLElement);
    expect(boardSent(c).at(-1)?.msg).toEqual({ t: 'open', open: true });
    expect(screen.getByRole('img', { name: t.classroom.board.title })).toBeTruthy();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
