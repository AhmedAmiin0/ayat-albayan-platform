import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { fakeClient, tile } from '#/classroom/room/livekit/fake-client.ts';
import { CONTEXT, familyRoom, openFamilyRoom, saveEarlierChoice } from './family-room.testing';

const me = tile({ key: 'me', name: 'يوسف', isLocal: true, role: 'guest' });
const teacher = tile({ key: 'fatima', name: 'فاطمة', role: 'teacher', speaking: true });
const assistant = tile({ key: 'maryam', name: 'مريم', role: 'assistant', micOn: false });

beforeEach(saveEarlierChoice);
afterEach(() => localStorage.clear());

describe('the family room (boards FamRoomWebWait / FamRoomWebLive)', () => {
  it('waits for the teacher while alone, with the lesson on the top line', () => {
    const context = { ...CONTEXT, waiting: <p>00:03:30</p> };
    openFamilyRoom(fakeClient({ tiles: [me] }), { context });
    expect(screen.getByRole('heading', { name: CONTEXT.title })).toBeTruthy();
    expect(screen.getByText(t.roomFlow.waiting.title)).toBeTruthy();
    expect(screen.getByText('00:03:30')).toBeTruthy();
    expect(screen.getByLabelText(`يوسف (${t.classroom.you})`)).toBeTruthy();
  });

  it('puts the speaking teacher on the stage once someone else is in', () => {
    const c = fakeClient({ tiles: [me] });
    openFamilyRoom(c);
    act(() => c.push({ tiles: [me, teacher, assistant] }));
    expect(screen.queryByText(t.roomFlow.waiting.title)).toBeNull();
    const stage = screen.getByRole('button', { name: t.classroom.stage.maximize });
    expect(within(stage).getByLabelText('فاطمة').getAttribute('data-speaking')).toBe('true');
  });

  it('lists the people read-only, the family as «الطالب»', () => {
    openFamilyRoom(fakeClient({ tiles: [me, teacher, assistant] }));
    fireEvent.click(screen.getByRole('button', { name: t.mobileRoom.count.replace('{n}', '3') }));
    const list = screen.getByRole('dialog', { name: t.roomFlow.panel.people.replace('{n}', '3') });
    expect(within(list).getByText(t.studentChannel.roles.student)).toBeTruthy();
    expect(within(list).getByText(t.classroom.roles.teacher)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.classroom.kick.actionOf.replace('{name}', 'مريم') })).toBeNull();
  });

  it('shows «جارٍ التسجيل» only while recording, and the strip while reconnecting', () => {
    const c = fakeClient({ tiles: [me, teacher] });
    openFamilyRoom(c);
    expect(screen.queryByText(t.classroom.recordingNow)).toBeNull();
    act(() => c.push({ isRecording: true, status: 'reconnecting' }));
    expect(screen.getByText(t.classroom.recordingNow)).toBeTruthy();
    expect(screen.getByText(t.classroom.reconnecting)).toBeTruthy();
  });
});

describe('leaving the family room (boards FamRoomWebLeave / FamRoomWebLeft / FamRoomWebEnded)', () => {
  it('asks first; «ابقَ في الحلقة» keeps the call', () => {
    const c = fakeClient({ tiles: [me, teacher] });
    openFamilyRoom(c);
    fireEvent.click(screen.getByRole('button', { name: t.classroom.leave }));
    expect(screen.getByRole('dialog', { name: t.mobileRoom.leaveAsk.title })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.mobileRoom.leaveAsk.stay }));
    expect(c.disconnect).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('«غادر» leaves: «خرجت من الحلقة» with «ادخل مرة أخرى» and «رجوع»', () => {
    let back = 0;
    let again = 0;
    const c = fakeClient({ tiles: [me, teacher] });
    openFamilyRoom(c, { onBack: () => (back += 1), onRejoin: () => (again += 1) });
    fireEvent.click(screen.getByRole('button', { name: t.classroom.leave }));
    fireEvent.click(screen.getByRole('button', { name: t.mobileRoom.controls.leave }));
    expect(screen.getByText(t.classroom.ended)).toBeTruthy();
    expect(screen.getByText(t.mobileRoom.left.body)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.rejoin }));
    fireEvent.click(screen.getByRole('button', { name: t.mobileRoom.back }));
    expect([again, back]).toEqual([1, 1]);
  });

  it('a room the teacher ended reads «انتهت الحلقة»; a 410 rejoin makes it final', () => {
    const c = fakeClient({ tiles: [me, teacher] });
    const ways = { onBack: () => undefined, onRejoin: () => undefined };
    const view = openFamilyRoom(c, ways);
    act(() => c.push({ status: 'closed' }));
    expect(screen.getByText(t.classroom.closedHint)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.classroom.rejoin })).toBeTruthy();
    const final = { busy: false, note: null, endedForAll: true };
    view.rerender(familyRoom(c, { ...ways, rejoin: final }));
    expect(screen.getByText(t.roomFlow.ended.body)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.classroom.rejoin })).toBeNull();
    expect(screen.getByRole('button', { name: t.mobileRoom.back })).toBeTruthy();
  });

  it('removed by the teacher: no rejoin, but never a dead end', () => {
    const c = fakeClient({ tiles: [me, teacher] });
    openFamilyRoom(c, { onBack: () => undefined, onRejoin: () => undefined });
    act(() => c.push({ status: 'removed' }));
    expect(screen.getByText(t.classroom.error.removed_from_room)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.classroom.rejoin })).toBeNull();
    expect(screen.getByRole('button', { name: t.mobileRoom.back })).toBeTruthy();
  });
});
