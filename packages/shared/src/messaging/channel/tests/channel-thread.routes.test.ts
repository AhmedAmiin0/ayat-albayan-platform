import { describe, expect, it } from 'vitest';
import { channelMonitorRoutes } from '../channel-monitor.routes';
import { channelPortalRoutes } from '../channel-portal.routes';
import { channelSalesRoutes } from '../channel-sales.routes';
import { channelTeacherRoutes } from '../channel-teacher.routes';

const ID = 'a1111111-1111-4111-8111-111111111111';
const AT = '2026-11-27T10:00:00.000Z';
const lines = (table: object) =>
  Object.values(table).map((r: { method: string; path: string }) => `${r.method} ${r.path}`);

describe('student chat thread routes per audience', () => {
  it('keeps the paths the api serves today', () => {
    expect(lines(channelTeacherRoutes)).toEqual([
      'GET /teachers/me/channels',
      'GET /teachers/me/channels/:studentId/messages',
      'POST /teachers/me/channels/:studentId/messages',
      'POST /teachers/me/channels/:studentId/read',
    ]);
    expect(lines(channelPortalRoutes)).toEqual([
      'GET /portal/students/:id/channel/messages',
      'POST /portal/students/:id/channel/messages',
      'POST /portal/students/:id/channel/read',
      'GET /portal/students/:id/channel/unread',
    ]);
    expect(lines(channelMonitorRoutes)).toEqual(['GET /students/:id/channel/messages']);
    expect(channelSalesRoutes.page.path).toBe('/sales/students/:id/channel/messages');
  });

  it('takes the student id under each path name and refuses anything else', () => {
    expect(channelTeacherRoutes.page.params.parse({ studentId: ID })).toEqual({ studentId: ID });
    expect(channelTeacherRoutes.post.params.safeParse({ id: ID }).success).toBe(false);
    expect(channelPortalRoutes.unread.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(channelMonitorRoutes.page.params.safeParse({}).success).toBe(false);
  });

  it('pages back only with an instant', () => {
    expect(channelPortalRoutes.page.query.parse({ before: AT })).toEqual({ before: AT });
    expect(channelSalesRoutes.page.query.parse({})).toEqual({});
    expect(channelMonitorRoutes.page.query.safeParse({ before: 'soon' }).success).toBe(false);
  });

  it('a read mark without a body reads up to now; a send needs text or a file', () => {
    expect(channelTeacherRoutes.read.body.parse(undefined)).toEqual({});
    expect(channelPortalRoutes.read.body.safeParse({ at: 'yesterday' }).success).toBe(false);
    expect(channelTeacherRoutes.post.body.safeParse({ body: ' ' }).success).toBe(false);
    expect(channelPortalRoutes.read.response).toBe('empty');
  });

  it('answers the teacher list rows, a last message or none', () => {
    const row = { student_id: ID, student_name: 'S', student_code: 'AB-0001', unread: 2 };
    const last = { body: 'hi', sender_role: 'guardian', created_at: AT, deleted: false };
    const list = channelTeacherRoutes.list.response;
    expect(list.parse([{ ...row, last_message: null }])).toHaveLength(1);
    expect(list.parse([{ ...row, last_message: last }])[0]?.last_message).toEqual(last);
    expect(list.safeParse([{ ...row, last_message: null, unread: 'x' }]).success).toBe(false);
  });

  it('lets each audience in by its own permission under the student-channels tag', () => {
    const tables = [channelTeacherRoutes, channelPortalRoutes, channelMonitorRoutes];
    const access = tables.map((t) => [
      ...new Set(Object.values(t).map((r) => `${r.permissions.join()} ${r.tags.join()}`)),
    ]);
    expect(access).toEqual([
      ['self.teacher student-channels'],
      ['self.portal student-channels'],
      ['student_channels.monitor student-channels'],
    ]);
    expect(channelSalesRoutes.page.permissions).toEqual(['self.sales']);
  });
});
