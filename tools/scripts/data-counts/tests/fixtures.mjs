import { readFileSync } from 'node:fs';

export const fixturePath = (name) => new URL(`./fixtures/${name}.sql`, import.meta.url);

export const fixture = (name) => readFileSync(fixturePath(name), 'utf8');

export const rejectedCases = () =>
  fixture('rejected')
    .trim()
    .split(/\n(?=-- count:)/)
    .map((block) => ({ name: block.split('\n')[0].slice('-- count: '.length), text: block }));
