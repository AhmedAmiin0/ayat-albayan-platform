/** Fake only `Date`: every timer stays real, so RNTL's waitFor/act never fight a fake clock. */
export function fakeNow(now: Date): void {
  jest.useFakeTimers({
    now,
    doNotFake: [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate',
      'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance',
    ],
  });
}
