import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { roomModerationApi } from '..';

const ROOM = '00000000-0000-4000-8000-000000000001';
const WHO = 'guest-0123456789ab';
const recording = {
  id: 'r1',
  status: 'done',
  started_at: '2026-11-16T17:00:00.000Z',
  ended_at: null,
  url: null,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { api: roomModerationApi(client), apiFetch, apiSend };
};

describe('roomModerationApi (R-CLS)', () => {
  it('reads a lesson\'s and a meeting\'s recordings', async () => {
    const { api, apiFetch } = clientAnswering([recording]);
    await expect(api.lessonRecordings(ROOM)).resolves.toEqual([recording]);
    await expect(api.meetingRecordings(ROOM)).resolves.toEqual([recording]);
    expect(apiFetch.mock.calls).toEqual([
      [`/lessons/${ROOM}/recordings`],
      [`/meetings/${ROOM}/recordings`],
    ]);
  });

  it('refuses a recording in an unknown state', async () => {
    const { api } = clientAnswering([{ ...recording, status: 'lost' }]);
    await expect(api.lessonRecordings(ROOM)).rejects.toThrow();
  });

  it('reads whether rooms are recorded', async () => {
    const { api, apiFetch } = clientAnswering({ configured: false });
    await expect(api.recordingStatus()).resolves.toEqual({ configured: false });
    expect(apiFetch).toHaveBeenCalledWith('/recordings/status');
  });

  it('mutes one source of someone in a meeting', async () => {
    const { api, apiSend } = clientAnswering(undefined);
    await api.muteInMeeting({ meetingId: ROOM, identity: WHO, source: 'microphone' });
    const path = `/meetings/${ROOM}/participants/${WHO}/mute`;
    expect(apiSend).toHaveBeenCalledWith('POST', path, { source: 'microphone' });
  });

  it('allows or stops one guest\'s screen share in a meeting', async () => {
    const { api, apiSend } = clientAnswering(undefined);
    await api.shareInMeeting({ meetingId: ROOM, identity: WHO, allow: false });
    const path = `/meetings/${ROOM}/participants/${WHO}/share`;
    expect(apiSend).toHaveBeenCalledWith('POST', path, { allow: false });
  });
});
