import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import {
  FAMILY_JOIN, fakeMedia, liveStream, openFamilyRoom, refused, saveEarlierChoice,
} from '@ab/web-kit/classroom/flow/family-room.testing';
import { fakeClient } from '@ab/web-kit/classroom/room/livekit/fake-client';
import { MEDIA_CHOICE_KEY } from '@ab/web-kit/classroom/entry/saved-choice';

const join = () => screen.getByRole('button', { name: t.mobileRoom.preview.join });

afterEach(() => localStorage.clear());

describe('«قبل الدخول» (the family room, board FamRoomWebCheck)', () => {
  it('previews before connecting, then joins with what was left on and remembers it', async () => {
    fakeMedia(() => Promise.resolve(liveStream()));
    const c = fakeClient();
    openFamilyRoom(c);
    expect(screen.getByRole('heading', { name: t.roomFlow.check.title })).toBeTruthy();
    expect(c.connect).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: t.classroom.camOff }));
    fireEvent.click(join());
    expect(c.connect).toHaveBeenCalledWith('wss://lk.test', 'tok', expect.objectContaining({ mic: true, cam: false }));
    expect(JSON.parse(localStorage.getItem(MEDIA_CHOICE_KEY) ?? '{}')).toMatchObject({ mic: true, cam: false });
  });

  it('a refused camera says so with «حاول مرة أخرى», which asks the browser again', async () => {
    const ask = fakeMedia((c) => (c.video ? refused() : Promise.resolve(liveStream())));
    openFamilyRoom(fakeClient());
    expect(await screen.findByText(t.classroom.error.cam_denied)).toBeTruthy();
    expect(screen.getByText(t.roomFlow.check.camDenied)).toBeTruthy();
    const before = ask.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: t.classroom.retry }));
    await waitFor(() => expect(ask.mock.calls.length).toBe(before + 2));
  });

  it('joins without a refused device', async () => {
    fakeMedia((c) => (c.video ? refused() : Promise.resolve(liveStream())));
    const c = fakeClient();
    openFamilyRoom(c);
    await screen.findByText(t.classroom.error.cam_denied);
    fireEvent.click(join());
    expect(c.connect).toHaveBeenCalledWith('wss://lk.test', 'tok', expect.objectContaining({ mic: true, cam: false }));
    // Never remembered as «off»: the check shows again next time, after allowing the camera.
    expect(localStorage.getItem(MEDIA_CHOICE_KEY)).toBeNull();
  });

  it('a browser without camera or microphone says so', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    openFamilyRoom(fakeClient());
    expect(await screen.findByText(t.classroom.error.device_missing)).toBeTruthy();
  });

  it('shows the consent line, unless this room records nothing', () => {
    fakeMedia(() => Promise.resolve(liveStream()));
    const { unmount } = openFamilyRoom(fakeClient());
    expect(screen.getByText(t.classroom.recordedNotice)).toBeTruthy();
    unmount();
    openFamilyRoom(fakeClient(), { join: { ...FAMILY_JOIN, recording: 'off' } });
    expect(screen.queryByText(t.classroom.recordedNotice)).toBeNull();
  });

  it('«رجوع» goes back without joining', () => {
    fakeMedia(() => Promise.resolve(liveStream()));
    const onBack = vi.fn();
    const c = fakeClient();
    openFamilyRoom(c, { onBack });
    fireEvent.click(screen.getByRole('button', { name: t.mobileRoom.back }));
    expect(onBack).toHaveBeenCalled();
    expect(c.connect).not.toHaveBeenCalled();
  });

  it('a choice saved by an earlier join goes straight in (and staff never see the check)', () => {
    saveEarlierChoice();
    const c = fakeClient();
    openFamilyRoom(c);
    expect(c.connect).toHaveBeenCalledWith('wss://lk.test', 'tok', expect.objectContaining({ mic: true, cam: false }));
    expect(screen.queryByRole('heading', { name: t.roomFlow.check.title })).toBeNull();
  });
});
