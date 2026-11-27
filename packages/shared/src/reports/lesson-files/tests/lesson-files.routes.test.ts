import { describe, expect, it } from 'vitest';
import { lessonFilesRoutes, portalAssetsRoutes } from '..';

const LESSON = '0b9f4a3e-7c1d-4e2a-9b6f-1d2c3e4f5a6b';
const file = {
  id: 'F',
  lesson_id: 'L',
  kind: 'homework',
  title: null,
  mime: 'image/png',
  size: 1,
  media: 'image',
  visible_to_family: true,
  created_at: '2026-11-16T17:00:00.000Z',
};
const assets = {
  lesson_id: 'L',
  starts_at: '2026-11-16T17:00:00.000Z',
  ends_at: '2026-11-16T17:30:00.000Z',
  students: [{ id: 'S', name: 'سهيلة', code: 'AB-0183' }],
  recordings: [],
  reports: [],
  files: [file],
};
const { visible_to_family: _shown, ...familyFile } = file;

describe('lessonFilesRoutes (R-REC)', () => {
  it.each([
    ['list', 'GET /lessons/:id/files'],
    ['uploadUrl', 'POST /lessons/:id/files/upload-url'],
    ['register', 'POST /lessons/:id/files'],
    ['visibility', 'PATCH /lesson-files/:id/visibility'],
    ['remove', 'DELETE /lesson-files/:id'],
    ['url', 'POST /lesson-files/:id/url'],
  ] as const)('%s keeps the path the api serves today', (key, wire) => {
    const route = lessonFilesRoutes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
  });

  it('refuses an id that is not a uuid, as the handlers did', () => {
    expect(lessonFilesRoutes.list.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(lessonFilesRoutes.remove.params.parse({ id: LESSON })).toEqual({ id: LESSON });
  });

  it('answers nothing on delete', () => {
    expect(lessonFilesRoutes.remove.response).toBe('empty');
  });

  it('answers the lesson page and refuses a file of an unknown kind', () => {
    expect(lessonFilesRoutes.list.response.parse(assets)).toEqual(assets);
    const bad = { ...assets, files: [{ ...file, kind: 'gift' }] };
    expect(lessonFilesRoutes.list.response.safeParse(bad).success).toBe(false);
  });

  it('registers a file shown to the family unless told otherwise', () => {
    const body = { mime: 'image/png', size: 10, kind: 'homework', path: 'p/1.png' };
    expect(lessonFilesRoutes.register.body.parse(body).visible_to_family).toBe(true);
  });

  it('refuses a visibility without a boolean', () => {
    expect(lessonFilesRoutes.visibility.body.safeParse({ visible: 'yes' }).success).toBe(false);
  });
});

describe('portalAssetsRoutes (R-PRT)', () => {
  it.each([
    ['recordings', 'GET /portal/students/:id/recordings'],
    ['lesson', 'GET /portal/students/:id/lessons/:lessonId/files'],
    ['fileUrl', 'POST /portal/students/:id/lesson-files/:fileId/url'],
  ] as const)('%s keeps the path the api serves today', (key, wire) => {
    const route = portalAssetsRoutes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
  });

  it('needs both ids as uuids on the lesson page', () => {
    const params = portalAssetsRoutes.lesson.params;
    expect(params.safeParse({ id: LESSON, lessonId: 'x' }).success).toBe(false);
    const both = { id: LESSON, lessonId: LESSON };
    expect(params.parse(both)).toEqual(both);
  });

  it('takes an optional download name and refuses a blank one', () => {
    const query = portalAssetsRoutes.fileUrl.query;
    expect(query.parse({})).toEqual({});
    expect(query.safeParse({ download: '  ' }).success).toBe(false);
  });

  it('hands the family no visibility flag on a lesson file', () => {
    const page = {
      lesson_id: 'L',
      lesson_starts_at: assets.starts_at,
      lesson_ends_at: assets.ends_at,
      teacher: null,
      report_id: null,
      recordings: [],
      files: [file],
    };
    expect(portalAssetsRoutes.lesson.response.parse(page).files).toEqual([familyFile]);
  });

  it('answers a link with its expiry', () => {
    const link = { url: 'https://x.test/f', expires_at: assets.ends_at };
    expect(portalAssetsRoutes.fileUrl.response.parse(link)).toEqual(link);
    expect(portalAssetsRoutes.fileUrl.response.safeParse({ url: 'u' }).success).toBe(false);
  });
});
