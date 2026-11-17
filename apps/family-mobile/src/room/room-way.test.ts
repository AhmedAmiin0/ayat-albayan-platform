import { joinWay, parseRoomParams, roomChatHref, roomHref } from './room-way';

const S = '11111111-1111-4111-8111-111111111111';
const L = '22222222-2222-4222-8222-222222222222';

test('our classroom opens in the app only while lessons open there; Meet never', () => {
  expect(joinWay('classroom', true)).toBe('room');
  expect(joinWay('classroom', false)).toBe('link');
  expect(joinWay('external', true)).toBe('link');
  expect(joinWay('none', true)).toBe('link');
});

test('the room link carries the student, and «direct» only from «بدأت الحلقة»', () => {
  expect(roomHref({ studentId: S, lessonId: L })).toBe(`/room/${L}?student=${S}`);
  expect(roomHref({ studentId: S, lessonId: L, direct: true })).toBe(
    `/room/${L}?student=${S}&direct=1`,
  );
  expect(roomChatHref(S)).toBe(`/room-chat/${S}`);
});

test('the route reads its params back, a bad or stale link as null', () => {
  expect(parseRoomParams({ id: L, student: S, direct: '1' })).toEqual({
    lessonId: L,
    studentId: S,
    direct: true,
  });
  expect(parseRoomParams({ id: L, student: S })?.direct).toBe(false);
  expect(parseRoomParams({ id: 'x', student: S })).toBeNull();
  expect(parseRoomParams({ id: L })).toBeNull();
});
