import { describe, expect, it } from 'vitest';
import { teacherPhotoRoutes, userPhotoRoutes } from './staff-photo.routes';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const paths = (routes: object) =>
  Object.values(routes).map((r: { method: string; path: string }) => `${r.method} ${r.path}`);

describe('staff photo routes (an admin edits another person’s photo)', () => {
  it('keeps the paths the api serves today', () => {
    expect(paths(teacherPhotoRoutes)).toEqual([
      'POST /teachers/:id/avatar/upload-url',
      'PUT /teachers/:id/avatar',
      'DELETE /teachers/:id/avatar',
    ]);
    expect(paths(userPhotoRoutes)).toEqual([
      'POST /users/:id/avatar/upload-url',
      'PUT /users/:id/avatar',
      'DELETE /users/:id/avatar',
    ]);
  });

  it('lets in teachers.write for a teacher and users.write for a login', () => {
    const keys = (routes: object) =>
      new Set(Object.values(routes).map((r: { permissions: string[] }) => r.permissions.join()));
    expect(keys(teacherPhotoRoutes)).toEqual(new Set(['teachers.write']));
    expect(keys(userPhotoRoutes)).toEqual(new Set(['users.write']));
    const all = [...Object.values(teacherPhotoRoutes), ...Object.values(userPhotoRoutes)];
    expect(new Set(all.map((r) => r.tags.join()))).toEqual(new Set(['staff-photos']));
  });

  it('refuses an id that is not a uuid and a gif', () => {
    expect(userPhotoRoutes.set.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(teacherPhotoRoutes.remove.params.parse({ id: ID })).toEqual({ id: ID });
    const gif = { mime: 'image/gif', size: 10 };
    expect(teacherPhotoRoutes.uploadUrl.body.safeParse(gif).success).toBe(false);
  });

  it('answers the photo url, or null for the initials', () => {
    const initials = { avatar_url: null };
    expect(userPhotoRoutes.remove.response.parse(initials)).toEqual(initials);
  });
});
