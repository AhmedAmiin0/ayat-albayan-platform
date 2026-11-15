import { createQueue } from './store-queue';

test('tasks run one at a time in call order; a failure does not block the next', async () => {
  const serial = createQueue();
  const log: string[] = [];
  const task = (name: string, fail = false) => async () => {
    log.push(`start ${name}`);
    await Promise.resolve();
    log.push(`end ${name}`);
    if (fail) throw new Error(name);
    return name;
  };
  const a = serial(task('a'));
  const b = serial(task('b', true));
  const c = serial(task('c'));
  await expect(Promise.all([a, c])).resolves.toEqual(['a', 'c']);
  await expect(b).rejects.toThrow('b');
  expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
});
