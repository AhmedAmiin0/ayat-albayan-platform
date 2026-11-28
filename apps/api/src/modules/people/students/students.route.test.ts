import { studentRoutes } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { routeOf } from '@/common/http/route';
import { StudentsController } from './students.controller';

describe('/students routes as declared (R-STU-01..05)', () => {
  it('serves every handler from its shared route object', () => {
    const proto = StudentsController.prototype;
    const served = {
      list: proto.list,
      statusCounts: proto.statusCounts,
      teacherOptions: proto.teacherOptions,
      get: proto.get,
      create: proto.create,
      update: proto.update,
      remove: proto.remove,
      merge: proto.merge,
    };
    const routes = Object.fromEntries(Object.entries(served).map(([k, h]) => [k, routeOf(h)]));
    expect(routes).toEqual(studentRoutes);
  });
});
