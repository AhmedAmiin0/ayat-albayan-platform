import { CHAT_TOPIC, type RoomJoinResult } from '@ab/shared';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeClient } from './fake-client';
import { useRoom } from './use-room';

// Owner, 2026-10-11: no text chat in a trial lesson's room (join.chat false); board data still flows.
const JOIN: RoomJoinResult = { url: 'wss://lk.test', token: 'tok', room: 'lesson-1', role: 'guest' };
const FROM = { identity: 't', role: 'teacher' } as const;
const bytes = new Uint8Array([1]);

function setup(chat: boolean | undefined) {
  const c = fakeClient();
  const join = { ...JOIN, ...(chat !== undefined && { chat }) };
  const make = () => c;
  const { result } = renderHook(() => useRoom(join, make));
  const heard = vi.fn();
  result.current.onData(heard);
  return { c, room: result.current, heard };
}

describe('useRoom text chat', () => {
  it('a trial lesson ignores incoming chat messages but still delivers the board', () => {
    const { c, heard } = setup(false);
    c.receive({ bytes, topic: CHAT_TOPIC, from: FROM });
    expect(heard).not.toHaveBeenCalled();
    c.receive({ bytes, topic: 'board', from: FROM });
    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ topic: 'board' }));
  });

  it('a trial lesson never sends on the chat topic; the board and requests still go out', () => {
    const { c, room } = setup(false);
    room.sendData(bytes, { topic: CHAT_TOPIC });
    expect(c.sendData).not.toHaveBeenCalled();
    room.sendData(bytes, { topic: 'board' });
    room.sendData(bytes, { topic: 'share-request' });
    expect(c.sendData.mock.calls.map(([, o]) => o.topic)).toEqual(['board', 'share-request']);
  });

  it.each([true, undefined])('any other lesson (chat %s) sends and delivers chat as before', (chat) => {
    const { c, room, heard } = setup(chat);
    c.receive({ bytes, topic: CHAT_TOPIC, from: FROM });
    expect(heard).toHaveBeenCalledTimes(1);
    room.sendData(bytes, { topic: CHAT_TOPIC });
    expect(c.sendData).toHaveBeenCalledTimes(1);
  });
});
