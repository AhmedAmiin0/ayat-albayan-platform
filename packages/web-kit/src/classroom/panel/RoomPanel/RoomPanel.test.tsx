import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { openFamilyRoom, saveEarlierChoice } from '@ab/web-kit/classroom/flow/family-room.testing';
import { fakeClient, tile } from '@ab/web-kit/classroom/room/livekit/fake-client';

const tiles = [tile({ key: 'me', name: 'يوسف', isLocal: true }), tile({ key: 'f', name: 'فاطمة', role: 'teacher' })];
const chat = (over = {}) => ({ unread: 3, locked: false, body: <p>thread</p>, ...over });
const unreadName = t.portal.app.child.chatUnread.replace('{n}', '3');

beforeEach(saveEarlierChoice);
afterEach(() => localStorage.clear());

describe('«المحادثة» in the family room (boards FamRoomWebLive / FamRoomPhoneChat)', () => {
  it('names its unread count, opens the student channel, and closes again', () => {
    openFamilyRoom(fakeClient({ tiles }), { chat: chat() });
    const button = screen.getByRole('button', { name: unreadName });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(screen.getByRole('dialog', { name: t.mobileRoom.controls.chat })).toBeTruthy();
    expect(screen.getByText('thread')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: unreadName }));
    expect(screen.queryByText('thread')).toBeNull();
  });

  it('its scroller leaves room for the composer under the newest message (--chat-end-gap)', () => {
    openFamilyRoom(fakeClient({ tiles }), { chat: chat() });
    fireEvent.click(screen.getByRole('button', { name: unreadName }));
    expect(screen.getByText('thread').parentElement?.className).toContain('[--chat-end-gap:');
  });

  it('switches between the chat and the people in the same panel', () => {
    openFamilyRoom(fakeClient({ tiles }), { chat: chat() });
    fireEvent.click(screen.getByRole('button', { name: unreadName }));
    fireEvent.click(screen.getByRole('tab', { name: t.roomFlow.panel.people.replace('{n}', '2') }));
    expect(screen.queryByText('thread')).toBeNull();
    const sheet = screen.getByRole('dialog', { name: t.roomFlow.panel.people.replace('{n}', '2') });
    expect(within(sheet).getByText(t.classroom.roles.teacher)).toBeTruthy();
  });

  it('a trial lesson explains that the chat opens after subscribing', () => {
    openFamilyRoom(fakeClient({ tiles }), { chat: chat({ unread: 0, locked: true }) });
    fireEvent.click(screen.getByRole('button', { name: t.mobileRoom.controls.chat }));
    expect(screen.getByText(t.studentChannel.closed)).toBeTruthy();
    expect(screen.queryByText('thread')).toBeNull();
  });

  it('has no chat button while family_chat_enabled is off (no chat slot)', () => {
    openFamilyRoom(fakeClient({ tiles }));
    expect(screen.queryByRole('button', { name: t.mobileRoom.controls.chat })).toBeNull();
  });
});
