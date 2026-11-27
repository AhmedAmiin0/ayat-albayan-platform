import { describe, expect, it } from 'vitest';
import {
  channelMonitorMessageRoutes,
  channelPortalMessageRoutes,
  channelSalesMessageRoutes,
  channelTeacherMessageRoutes,
} from '../channel-message.routes';

const ID = 'a1111111-1111-4111-8111-111111111111';
const AT = '2026-11-27T10:00:00.000Z';
const lines = (table: object) =>
  Object.values(table).map((r: { method: string; path: string }) => `${r.method} ${r.path}`);
const access = (table: object) =>
  Object.values(table).map((r: { permissions: unknown; tags: unknown }) => [r.permissions, r.tags]);
const PORTAL = '/portal/students/:id/channel';
const MESSAGE = 'messages/:messageId';

describe('student chat file, read info, edit and delete routes per audience', () => {
  it('keeps the paths the api serves today', () => {
    const teacher = '/teachers/me/channels/:studentId';
    expect(lines(channelTeacherMessageRoutes)).toEqual([
      `POST ${teacher}/attachments/upload-url`,
      `GET ${teacher}/${MESSAGE}/reads`,
      `PATCH ${teacher}/${MESSAGE}`,
      `DELETE ${teacher}/${MESSAGE}`,
    ]);
    expect(lines(channelPortalMessageRoutes)).toEqual([
      `POST ${PORTAL}/attachments/upload-url`,
      `GET ${PORTAL}/${MESSAGE}/reads`,
      `PATCH ${PORTAL}/${MESSAGE}`,
      `DELETE ${PORTAL}/${MESSAGE}`,
    ]);
    expect(channelSalesMessageRoutes.edit.path).toBe(`/sales/students/:id/channel/${MESSAGE}`);
    expect(lines(channelMonitorMessageRoutes)).toEqual([
      `GET /students/:id/channel/${MESSAGE}/reads`,
      `DELETE /students/:id/channel/${MESSAGE}`,
    ]);
  });

  it('takes the student and message ids under each path name and refuses anything else', () => {
    const both = { studentId: ID, messageId: ID };
    expect(channelTeacherMessageRoutes.edit.params.parse(both)).toEqual(both);
    expect(channelTeacherMessageRoutes.upload.params.safeParse({ id: ID }).success).toBe(false);
    expect(channelPortalMessageRoutes.reads.params.safeParse({ id: ID }).success).toBe(false);
    expect(channelSalesMessageRoutes.remove.params.safeParse({ id: 'x', messageId: ID }).success)
      .toBe(false);
    expect(channelMonitorMessageRoutes.remove.params.parse({ id: ID, messageId: ID })).toEqual({
      id: ID,
      messageId: ID,
    });
  });

  it('signs an upload only for a file the chat takes, within its size cap', () => {
    const body = channelPortalMessageRoutes.upload.body;
    expect(body.parse({ mime: 'application/pdf', size: 10, name: 'a.pdf' }).name).toBe('a.pdf');
    expect(body.safeParse({ mime: 'text/html', size: 10, name: 'a' }).success).toBe(false);
    expect(body.safeParse({ mime: 'image/jpeg', size: 0, name: 'a' }).success).toBe(false);
    const signed = { bucket: 'b', path: 'p', token: 't', signed_url: 'https://x.test/u' };
    expect(channelTeacherMessageRoutes.upload.response.parse(signed)).toEqual(signed);
  });

  it('edits only to a non-empty text and answers the message', () => {
    const body = channelSalesMessageRoutes.edit.body;
    expect(body.parse({ body: 'hi' })).toEqual({ body: 'hi' });
    expect(body.safeParse({ body: '' }).success).toBe(false);
    expect(body.safeParse({}).success).toBe(false);
    expect(channelPortalMessageRoutes.remove.response)
      .toBe(channelTeacherMessageRoutes.edit.response);
  });

  it('answers who read one message, who has not yet, an unknown role as such', () => {
    const reads = { read: [{ name: 'S', role: 'guardian', at: AT }], unread: [] };
    const answer = channelMonitorMessageRoutes.reads.response;
    expect(answer.parse(reads)).toEqual(reads);
    const odd = answer.parse({ read: [], unread: [{ name: 'S', role: 'nobody' }] });
    expect(odd.unread[0]?.role).toBe('unknown');
    expect(answer.safeParse({ read: [{ name: 'S', role: 'guardian' }], unread: [] }).success)
      .toBe(false);
  });

  it('lets each audience in by its own permission under the student-channels tag', () => {
    const tag = ['student-channels'];
    expect(access(channelTeacherMessageRoutes)).toEqual(Array(4).fill([['self.teacher'], tag]));
    expect(access(channelPortalMessageRoutes)).toEqual(Array(4).fill([['self.portal'], tag]));
    expect(access(channelSalesMessageRoutes)).toEqual(Array(4).fill([['self.sales'], tag]));
    expect(access(channelMonitorMessageRoutes))
      .toEqual(Array(2).fill([['student_channels.monitor'], tag]));
  });
});
