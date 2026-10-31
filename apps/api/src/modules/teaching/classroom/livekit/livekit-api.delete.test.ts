import { describe, expect, it } from 'vitest';
import { CONFIG, decode } from '@/modules/teaching/classroom/classroom.fakes';
import { http } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import { LivekitApi } from './livekit-api';

const NOW = new Date('2026-10-30T12:00:00.000Z');

describe('LivekitApi.deleteRoom', () => {
  it('POSTs {room} to RoomService/DeleteRoom with a roomCreate token; true once closed', async () => {
    const h = http();
    expect(await new LivekitApi(CONFIG, h).deleteRoom('meeting-1', NOW)).toBe(true);
    const [url, init] = h.mock.calls[0] ?? [];
    expect(url).toBe('https://livekit.example.test/twirp/livekit.RoomService/DeleteRoom');
    expect(JSON.parse(init?.body ?? '{}')).toEqual({ room: 'meeting-1' });
    const auth = init?.headers.authorization ?? '';
    expect(decode(auth.replace('Bearer ', '')).video).toEqual({ roomCreate: true });
  });

  it('a room already gone (not_found) is false; any other failure throws', async () => {
    const gone = http({ status: 404, body: { code: 'not_found' } });
    expect(await new LivekitApi(CONFIG, gone).deleteRoom('meeting-1', NOW)).toBe(false);
    const down = http({ status: 500, body: { code: 'internal' } });
    await expect(new LivekitApi(CONFIG, down).deleteRoom('meeting-1', NOW)).rejects.toThrow('livekit 500');
  });
});
