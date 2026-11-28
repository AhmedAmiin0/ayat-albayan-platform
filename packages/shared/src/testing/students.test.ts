import { describe, expect, it } from 'vitest';
import { studentListItemSchema, studentProfileSchema } from '../people/students/roster';
import { studentListItemFixture, studentProfileFixture } from './students';

describe('student fixtures', () => {
  it('build a GET /students row the list schema accepts', () => {
    const row = studentListItemFixture({ name: 'جود', teacher_name: 'أ. سارة' });
    expect(studentListItemSchema.parse(row)).toEqual(row);
    expect(row).toMatchObject({ name: 'جود', teacher_name: 'أ. سارة', status: 'active' });
  });

  it('build a profile the profile schema accepts', () => {
    const profile = studentProfileFixture();
    expect(studentProfileSchema.parse(profile)).toEqual(profile);
  });
});
