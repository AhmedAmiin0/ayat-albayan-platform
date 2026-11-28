import { describe, expect, it } from 'vitest';
import { IS_PUBLIC, OWN_PUBLIC } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { lessonLinkRoutes } from './http';
import { LegacyReportLinkController, TeacherJoinController } from './lesson-links.controller';

const links = [
  ['teacher join', TeacherJoinController, lessonLinkRoutes.join],
  ['legacy report', LegacyReportLinkController, lessonLinkRoutes.legacyReport],
] as const;

describe('lesson links with no login: public through their route objects', () => {
  it.each(links)('%s serves its route and is public from it alone', (_name, cls, route) => {
    const handler = cls.prototype.go;
    expect(routeOf(handler)).toBe(route);
    expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBe(true);
    expect(Reflect.getMetadata(OWN_PUBLIC, handler)).toBeUndefined();
    expect(Reflect.getMetadata(OWN_PUBLIC, cls)).toBeUndefined();
  });
});
