import { firstStep, stepBack, stepNumber } from './course-steps';

describe('the course wizard’s steps', () => {
  it('a renewal opens on «تابِع بنفس الأيام», a first course on the teacher', () => {
    expect(firstStep(true)).toBe('continue');
    expect(firstStep(false)).toBe('teacher');
  });

  it('«رجوع» on a first course: review → days → teacher → out', () => {
    const base = { same: false, renewal: false };
    expect(stepBack({ ...base, step: 'confirm' })).toBe('slot');
    expect(stepBack({ ...base, step: 'slot' })).toBe('teacher');
    expect(stepBack({ ...base, step: 'teacher' })).toBeNull();
  });

  it('«رجوع» on a renewal: the teacher goes back to «تابِع بنفس الأيام», which leaves', () => {
    const base = { same: false, renewal: true };
    expect(stepBack({ ...base, step: 'teacher' })).toBe('continue');
    expect(stepBack({ ...base, step: 'continue' })).toBeNull();
    expect(stepBack({ ...base, step: 'confirm' })).toBe('slot');
  });

  it('with the same days the skipped teacher step is skipped back too', () => {
    const base = { same: true, renewal: true };
    expect(stepBack({ ...base, step: 'confirm' })).toBe('continue');
    expect(stepBack({ ...base, step: 'slot' })).toBe('continue');
  });

  it('«الخطوة n من 3»: «تابِع بنفس الأيام» counts as the first', () => {
    expect(stepNumber('continue')).toBe(1);
    expect(stepNumber('teacher')).toBe(1);
    expect(stepNumber('slot')).toBe(2);
    expect(stepNumber('confirm')).toBe(3);
  });
});
