import type { RoomJoinResult } from '@ab/schedule';
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClassroomRoomProps } from '@ab/web-kit/classroom/room/components/ClassroomRoom';
import { ApiError } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { kid, lesson } from '@ab/web-kit/portal/portal.fixtures';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { RoomOverlay } from '@ab/web-kit/portal/lessons/RoomOverlay';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiSend }));
const seen = vi.hoisted(() => ({ props: null as ClassroomRoomProps | null }));
vi.mock('@ab/web-kit/classroom/room/components/ClassroomRoom/ClassroomRoom', () => ({
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
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/lessons/l1/join', undefined);
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
