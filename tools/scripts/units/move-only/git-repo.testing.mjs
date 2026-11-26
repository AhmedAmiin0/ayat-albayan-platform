// A throwaway git repo for the gate tests: `base` committed on develop, then `edit` on `branch`.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export function gitRepo({ base, branch, edit }) {
  const cwd = mkdtempSync(join(tmpdir(), 'move-only-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  const write = (files) =>
    Object.entries(files).forEach(([path, text]) => {
      mkdirSync(dirname(join(cwd, path)), { recursive: true });
      writeFileSync(join(cwd, path), text);
    });
  const move = (from, to) => {
    mkdirSync(dirname(join(cwd, to)), { recursive: true });
    git('mv', from, to);
  };
  git('init', '-q', '-b', 'develop');
  git('config', 'user.email', 'ci@example.test');
  git('config', 'user.name', 'ci');
  write(base);
  git('add', '-A');
  git('commit', '-qm', 'base');
  git('update-ref', 'refs/remotes/origin/develop', 'HEAD');
  git('checkout', '-qb', branch);
  edit({ write, move, remove: (path) => git('rm', '-q', path) });
  git('add', '-A');
  git('commit', '-qm', 'head', '--allow-empty');
  return cwd;
}
