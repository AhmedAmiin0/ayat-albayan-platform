import type { RoomJoinResult } from '@ab/shared';
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClassroomRoomProps } from '#/classroom/room/components/ClassroomRoom/index.ts';
import { ApiError } from '#/lib/http/api/index.ts';
import { t } from '#/lib/i18n/i18n.ts';
import { kid, lesson } from '#/portal/portal.fixtures.ts';
import { renderPortal } from '#/portal/portal.render.tsx';
import { RoomOverlay } from '#/portal/lessons/RoomOverlay.tsx';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('#/lib/http/api/api.ts', async (orig) => ({ ...(await orig<object>()), apiSend }));
const seen = vi.hoisted(() => ({ props: null as ClassroomRoomProps | null }));
vi.mock('#/classroom/room/components/ClassroomRoom/ClassroomRoom.tsx', () => ({
  ClassroomRoom: (props: ClassroomRoomProps) => {
    seen.props = props;
    return <p>{props.join.token}</p>;
  },
}));

const FIRST: RoomJoinResult = { url: 'wss://lk.test', token: 't1', room: 'lesson-l1', role: 'guest' };
const about = { lesson: lesson(), student: kid() };
const props = (): ClassroomRoomProps => {
  if (!seen.props) throw new Error('not rendered');
  return seen.props;
};

afterEach(() => apiSend.mockReset());

describe('the room overlay’s own «ادخل مرة أخرى»', () => {
  it('asks the API again and opens the room on the fresh token', async () => {
    apiSend.mockResolvedValue({ ...FIRST, token: 't2' });
    renderPortal(<RoomOverlay join={FIRST} onRejoin={() => undefined} about={about} />);
    expect(props().variant).toBe('family');
    expect(props().context?.title).toBe(t.roomFlow.title.replace('{student}', 'سلمى').replace('{teacher}', 'أبرار'));
    act(() => props().onRejoin?.());
    expect(await screen.findByText('t2')).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/lessons/l1/join');
  });

  it('410 lesson_ended makes it final; another refusal stays in its own words', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(410, { code: 'lesson_ended' }));
    renderPortal(<RoomOverlay join={FIRST} onRejoin={() => undefined} about={about} />);
    act(() => props().onRejoin?.());
    await vi.waitFor(() => expect(props().rejoin?.endedForAll).toBe(true));
    apiSend.mockRejectedValueOnce(new ApiError(429, { code: 'too_many_requests' }));
    act(() => props().onRejoin?.());
    await vi.waitFor(() => expect(props().rejoin?.note).toBe(t.classroom.error.too_many_requests));
    expect(props().rejoin?.endedForAll).toBe(false);
  });

  it('without the lesson (the week), «ادخل مرة أخرى» hands back to the card', () => {
    const onRejoin = vi.fn();
    renderPortal(<RoomOverlay join={FIRST} onRejoin={onRejoin} />);
    act(() => props().onRejoin?.());
    expect(onRejoin).toHaveBeenCalled();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
