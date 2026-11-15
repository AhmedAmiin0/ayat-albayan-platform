import {
  INITIAL_LOCK,
  isCovering,
  LOCK_AFTER_MS,
  type LockEvent,
  lockReducer,
  type LockState,
  showsLock,
} from './lock-machine';

const run = (events: LockEvent[], from: LockState = INITIAL_LOCK) =>
  events.reduce(lockReducer, from);
const on = run([{ type: 'loaded', enabled: true }]);
const open = run([{ type: 'prompt' }, { type: 'success' }], on);

test('checking covers; the flag off opens the app, on shows the lock', () => {
  expect(isCovering(INITIAL_LOCK)).toBe(true);
  const off = run([{ type: 'loaded', enabled: false }]);
  expect(off).toMatchObject({ enabled: false, phase: 'open' });
  expect(isCovering(off)).toBe(false);
  expect(on).toMatchObject({ enabled: true, phase: 'locked', failed: false });
  expect(showsLock(on)).toBe(true);
});

test('loaded only applies while checking', () => {
  expect(lockReducer(open, { type: 'loaded', enabled: true })).toBe(open);
});

test('success after the prompt opens; cancel or failure stays on the lock, marked failed', () => {
  expect(open).toMatchObject({ phase: 'open', failed: false });
  const failed = run([{ type: 'prompt' }, { type: 'fail' }], on);
  expect(failed).toMatchObject({ phase: 'locked', failed: true });
  expect(run([{ type: 'prompt' }, { type: 'success' }], failed)).toMatchObject({ phase: 'open' });
});

test('success without a prompt does nothing (no way past the lock but the OS prompt)', () => {
  expect(lockReducer(on, { type: 'success' })).toBe(on);
});

test('background: covered at once; back before 5 minutes opens, at 5 minutes locks', () => {
  const hidden = lockReducer(open, { type: 'hide', at: 1000 });
  expect(hidden).toMatchObject({ phase: 'covered', hiddenAt: 1000 });
  expect(isCovering(hidden)).toBe(true);
  expect(showsLock(hidden)).toBe(false);
  expect(lockReducer(hidden, { type: 'show', at: 1000 + LOCK_AFTER_MS - 1 }).phase).toBe('open');
  const back = lockReducer(hidden, { type: 'show', at: 1000 + LOCK_AFTER_MS });
  expect(back).toMatchObject({ phase: 'locked', failed: false, hiddenAt: null });
});

test('a second hide keeps the first time (inactive, then background)', () => {
  const hidden = run(
    [
      { type: 'hide', at: 1 },
      { type: 'hide', at: 9 },
    ],
    open,
  );
  expect(hidden.hiddenAt).toBe(1);
});

test('switch off: background and foreground change nothing', () => {
  const off = run([{ type: 'loaded', enabled: false }]);
  expect(
    run(
      [
        { type: 'hide', at: 0 },
        { type: 'show', at: LOCK_AFTER_MS * 9 },
      ],
      off,
    ),
  ).toBe(off);
});

test('the OS prompt passing through inactive (iOS Face ID) leaves the app open after it', () => {
  const prompting = lockReducer(on, { type: 'prompt' });
  const back = run(
    [
      { type: 'hide', at: 5 },
      { type: 'show', at: 6 },
    ],
    prompting,
  );
  expect(back).toMatchObject({ phase: 'prompting', hiddenAt: null });
  expect(lockReducer(back, { type: 'success' }).phase).toBe('open');
});

test('backgrounded during the dissolve: covered after it, locked again after 5 minutes', () => {
  const left = run([{ type: 'prompt' }, { type: 'hide', at: 5 }, { type: 'success' }], on);
  expect(left).toMatchObject({ phase: 'covered', hiddenAt: 5 });
  expect(lockReducer(left, { type: 'show', at: 5 + LOCK_AFTER_MS }).phase).toBe('locked');
  expect(lockReducer(left, { type: 'show', at: 6 }).phase).toBe('open');
});

test('biometrics removed while covered: off, but never opens (only the sign-in is left)', () => {
  expect(lockReducer(on, { type: 'removed' })).toMatchObject({
    enabled: false,
    phase: 'locked',
    failed: true,
  });
  const prompting = lockReducer(on, { type: 'prompt' });
  expect(lockReducer(prompting, { type: 'removed' }).phase).toBe('locked');
  expect(lockReducer(open, { type: 'removed' })).toMatchObject({ enabled: false, phase: 'open' });
});

test('the settings switch off keeps the open app open', () => {
  expect(lockReducer(open, { type: 'disabled' })).toMatchObject({ enabled: false, phase: 'open' });
});

test('enabled turns the flag on without locking the open app', () => {
  const off = run([{ type: 'loaded', enabled: false }, { type: 'enabled' }]);
  expect(off).toMatchObject({ enabled: true, phase: 'open' });
});

test('sign-out (the other way) clears the flag and stays covered until a new sign-in', () => {
  const ended = lockReducer(on, { type: 'signedOut' });
  expect(ended).toMatchObject({ enabled: false, phase: 'ended' });
  expect(isCovering(ended)).toBe(true);
  expect(lockReducer(ended, { type: 'signedIn' })).toMatchObject({ phase: 'open' });
  expect(lockReducer(open, { type: 'signedOut' })).toMatchObject({ enabled: false, phase: 'open' });
});

test('a fresh sign-in (a password or code; bio-lock never sends it for a restored session) opens', () => {
  expect(lockReducer(on, { type: 'signedIn' })).toMatchObject({ enabled: false, phase: 'open' });
  expect(lockReducer(open, { type: 'signedIn' })).toBe(open);
});
