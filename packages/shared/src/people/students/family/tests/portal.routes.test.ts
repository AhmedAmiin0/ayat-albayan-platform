import { describe, expect, it } from 'vitest';
import { portalLessonRoutes } from '../portal-actions.routes';
import { portalRoutes } from '../portal.routes';

const S = '11111111-1111-4111-8111-111111111111';
const L = '22222222-2222-4222-8222-222222222222';
const ALL = [...Object.values(portalRoutes), ...Object.values(portalLessonRoutes)];

describe('portalRoutes (docs/31, docs/50: the family reads its own students)', () => {
  it('keeps the paths the api serves today', () => {
    const student = '/portal/students/:id';
    expect(Object.values(portalRoutes).map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /portal/me',
      `GET ${student}/lessons`,
      `GET ${student}/history`,
      `POST ${student}/lessons/:lessonId/room-link`,
      `GET ${student}/reports`,
      `POST ${student}/reports/:reportId/url`,
      `POST ${student}/recordings/:recordingId/url`,
      `GET ${student}/package`,
    ]);
  });

  it('lets in the family scope key only, under the portal tag', () => {
    expect(new Set(ALL.map((r) => r.permissions.join()))).toEqual(new Set(['self.portal']));
    expect(new Set(ALL.map((r) => r.tags.join()))).toEqual(new Set(['portal']));
  });

  it('refuses an id that is not a uuid', () => {
    expect(portalRoutes.lessons.params.safeParse({ id: 'x' }).success).toBe(false);
    const file = portalRoutes.recordingUrl.params;
    expect(file.safeParse({ id: S, recordingId: 'x' }).success).toBe(false);
    const ids = { id: S, lessonId: L };
    expect(portalRoutes.roomLink.params.parse(ids)).toEqual(ids);
  });

  it('reads history by status, the cursor only as an instant', () => {
    const { query } = portalRoutes.history;
    expect(query.parse({ status: 'absent' })).toEqual({ status: 'absent' });
    expect(query.safeParse({ status: 'late' }).success).toBe(false);
    expect(query.safeParse({ status: 'absent', cursor: 'yesterday' }).success).toBe(false);
  });

  it('fills the package defaults an older api leaves out', () => {
    const view = portalRoutes.package.response.parse({ package: null });
    expect(view).toEqual({ package: null, payments: [], payment_instructions: '' });
  });
});
