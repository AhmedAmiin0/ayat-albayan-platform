import { jana, lesson, yusuf } from '../testing/fixtures';
import { studentNames } from './lesson-text';

// The UI in English: the compact row joins names with en.json's «, ».
jest.mock('@/core/lib/i18n/i18n', () => ({
  ...jest.requireActual<object>('@/core/lib/i18n/i18n'),
  t: jest.requireActual<object>('@ab/shared/i18n/en.json'),
}));

test('names of every student on the lesson, joined the English way', () => {
  expect(studentNames(lesson({ id: 'g', students: [yusuf, jana] }))).toBe('يوسف أحمد, جنى وليد');
});
