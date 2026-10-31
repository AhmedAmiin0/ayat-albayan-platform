import { classroomUrl, meetingUrl, webOrigin } from './web-origin';

const KEY = 'EXPO_PUBLIC_WEB_ORIGIN';
const saved = process.env[KEY];
afterEach(() => {
  Reflect.deleteProperty(process.env, KEY);
  if (saved !== undefined) process.env[KEY] = saved;
});

test('without the env var the production origin is used', () => {
  Reflect.deleteProperty(process.env, KEY);
  expect(webOrigin()).toBe('https://app.ayatalbayan.com');
  expect(classroomUrl('l-1')).toBe('https://app.ayatalbayan.com/classroom/l-1');
  expect(meetingUrl('m-1')).toBe('https://app.ayatalbayan.com/meeting/m-1');
});

test('an empty value falls back too', () => {
  process.env[KEY] = '  ';
  expect(webOrigin()).toBe('https://app.ayatalbayan.com');
});

test('the env var wins and a trailing slash is dropped', () => {
  process.env[KEY] = 'https://staging.example.com/';
  expect(webOrigin()).toBe('https://staging.example.com');
  expect(classroomUrl('l-2')).toBe('https://staging.example.com/classroom/l-2');
});
