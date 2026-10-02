import { jana, lesson, yusuf } from './fixtures';
import { studentNames } from './lesson-text';

// The UI in English: the compact row joins names with en.json's «, ».
jest.mock('@/lib/i18n', () => ({
  ...jest.requireActual<object>('@/lib/i18n'),
  t: jest.requireActual<object>('@ab/shared/i18n/en.json'),
}));

test('names of every student on the lesson, joined the English way', () => {
  expect(studentNames(lesson({ id: 'g', students: [yusuf, jana] }))).toBe('يوسف أحمد, جنى وليد');
});
