import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelApp, ST, type Who } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;
const M = 'd4000000-0000-4000-8000-000000000001';
const TEACHER = (id: string) => `/teachers/me/channels/${id}`;
const PORTAL = (id: string) => `/portal/students/${id}/channel`;
const SALES = (id: string) => `/sales/students/${id}/channel`;
const MONITOR = (id: string) => `/students/${id}/channel`;
const CHATS: [(id: string) => string, Who][] = [
  [TEACHER, 'teacher'],
  [PORTAL, 'guardian'],
  [SALES, 'sales'],
];
const answer = (r: Awaited<ReturnType<App['call']>>) => [
  r.statusCode,
  r.json<{ message: string }>().message,
];
const FILE = { mime: 'application/pdf', size: 10, name: 'a.pdf' };

describe('student chat files, read info, edits and deletes served from route objects', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  it('a malformed student id on an upload slot is refused before any access check', async () => {
    const seen = [];
    for (const [at, who] of CHATS) {
      seen.push(answer(await t.post(`${at('x')}/attachments/upload-url`, who, FILE)));
    }
    expect(seen).toEqual(Array(3).fill([400, 'validation_failed']));
    expect(t.storage.signedUpload).not.toHaveBeenCalled();
  });

  it('a malformed message id on read info, an edit or a delete touches nothing', async () => {
    const seen = [
      answer(await t.call('GET', `${TEACHER(ST)}/messages/x/reads`, 'teacher')),
      answer(await t.call('GET', `${MONITOR(ST)}/messages/x/reads`, 'admin')),
      answer(await t.patch(`${PORTAL(ST)}/messages/x`, 'guardian', { body: 'hi' })),
      answer(await t.call('DELETE', `${SALES(ST)}/messages/x`, 'sales')),
      answer(await t.call('DELETE', `${MONITOR(ST)}/messages/x`, 'admin')),
    ];
    expect(seen).toEqual(Array(5).fill([400, 'validation_failed']));
    expect(t.edits.message).not.toHaveBeenCalled();
  });

  it('an edit to empty text is refused on every chat and stores nothing', async () => {
    const seen = [];
    for (const [at, who] of CHATS) {
      seen.push(answer(await t.patch(`${at(ST)}/messages/${M}`, who, { body: ' ' })));
    }
    expect(seen).toEqual(Array(3).fill([400, 'validation_failed']));
    expect(t.edits.edit).not.toHaveBeenCalled();
  });

  it('a file type the chat does not take is refused before a slot is signed', async () => {
    const res = await t.post(`${PORTAL(ST)}/attachments/upload-url`, 'guardian', {
      ...FILE,
      mime: 'text/html',
    });
    expect(res.statusCode).toBe(400);
    expect(t.storage.signedUpload).not.toHaveBeenCalled();
  });

  it('each audience is refused on the routes of the others', async () => {
    const codes = [
      (await t.patch(`${TEACHER(ST)}/messages/${M}`, 'guardian', { body: 'hi' })).statusCode,
      (await t.call('DELETE', `${PORTAL(ST)}/messages/${M}`, 'teacher')).statusCode,
      (await t.call('GET', `${SALES(ST)}/messages/${M}/reads`, 'guardian')).statusCode,
      (await t.call('DELETE', `${MONITOR(ST)}/messages/${M}`, 'teacher')).statusCode,
    ];
    expect(codes).toEqual([403, 403, 403, 403]);
  });

  it('the assistant is refused a moderation delete and nothing is deleted', async () => {
    const res = await t.call('DELETE', `${MONITOR(ST)}/messages/${M}`, 'sales');
    expect(res.statusCode).toBe(403);
    expect(t.edits.remove).not.toHaveBeenCalled();
  });
});
