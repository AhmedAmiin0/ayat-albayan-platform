import { describe, expect, it } from 'vitest';
import { alertTile, GROUP_TONE } from './alert-look';

describe('a bell row’s look on the family pages', () => {
  it('the tile follows what the row opens', () => {
    expect(alertTile({ screen: 'report', studentId: 's1', reportId: 'r1' })).toEqual({
      icon: 'receipt',
      tone: 'teal',
    });
    expect(alertTile({ screen: 'package', studentId: 's1' }).tone).toBe('gold');
    expect(alertTile({ screen: 'live', studentId: 's1', lessonId: 'l1' }).icon).toBe('bolt');
  });

  it('a row that opens nothing: the bell', () => {
    expect(alertTile(null)).toEqual({ icon: 'bell', tone: 'teal' });
  });

  it('each day group has its card edge', () => {
    expect(GROUP_TONE).toEqual({ today: 'green', yesterday: 'gold', week: 'teal', older: 'plain' });
  });
});
