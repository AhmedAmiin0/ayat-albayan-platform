import { InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { toAssistantLesson, toAssistantView } from './assistants.mapper';

const lesson = {
  lesson_id: 'L', starts_at: '2026-11-16T17:00:00.000Z', ends_at: '2026-11-16T17:30:00.000Z',
  status: 'scheduled' as const, teacher_name: 'أبرار', student_names: ['ليلى'],
};

describe('assistant mappers', () => {
  it('names a profile row as the picker reads it', () => {
    expect(toAssistantView({ id: 'P', full_name: 'نور' })).toEqual({ profile_id: 'P', full_name: 'نور' });
  });

  it('passes a lesson in a known state', () => {
    expect(toAssistantLesson(lesson)).toEqual(lesson);
  });

  it('500 response_invalid for a lesson the schema refuses', () => {
    const bad = { ...lesson, student_names: [1] };
    expect(() => toAssistantLesson(JSON.parse(JSON.stringify(bad)))).toThrow(
      InternalServerErrorException,
    );
  });
});
