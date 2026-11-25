import { describe, expect, it } from 'vitest';
import { offPathKeys, pathKey } from '../../..';

const startsWith = (key: readonly unknown[], prefix: readonly unknown[]): boolean =>
  prefix.every((part, i) => key[i] === part);

describe('offPathKeys', () => {
  it('keys a bubble file by phone and message', () => {
    expect(offPathKeys.threadFile('+201', 'm1')).toEqual(['thread-file', '+201', 'm1']);
  });

  it('keys the portal signed links by student and asset', () => {
    expect(offPathKeys.portalRecordingUrl('s1', 'r1')).toEqual([
      'portal-recording-url',
      's1',
      'r1',
    ]);
    expect(offPathKeys.portalLessonFileUrl('s1', 'f1')).toEqual([
      'portal-lesson-file-url',
      's1',
      'f1',
    ]);
  });

  it('keys the reply lesson per reading flow', () => {
    expect(offPathKeys.replyLesson('sales', 'l1')).toEqual(['reply-lesson', 'sales', 'l1']);
    expect(offPathKeys.replyLesson('admin', 'l1')).toEqual(['reply-lesson', 'admin', 'l1']);
  });

  it('stays out of the path roots whose invalidation would re-sign or empty an open view', () => {
    const roots = ['/threads', '/portal', '/lessons', '/sales'].map(pathKey);
    const keys = [
      offPathKeys.threadFile('+201', 'm1'),
      offPathKeys.portalRecordingUrl('s1', 'r1'),
      offPathKeys.portalLessonFileUrl('s1', 'f1'),
      offPathKeys.replyLesson('admin', 'l1'),
    ];
    const reached = keys.filter((key) => roots.some((root) => startsWith(key, root)));
    expect(reached).toEqual([]);
  });
});
