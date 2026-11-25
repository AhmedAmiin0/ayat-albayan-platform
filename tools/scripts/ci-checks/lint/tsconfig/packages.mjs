// The package tsconfig shape (docs/64 PR 2): every common setting lives in the root
// tsconfig.base.json, each package kind's differences in one root tsconfig.<kind>.json, and a
// package holds only a one-line tsconfig.json that names its kind.
import { isDeepStrictEqual } from 'node:util';

export const KINDS = ['node', 'web', 'native'];
const KIND_FILES = new Set(KINDS.map((kind) => `tsconfig.${kind}.json`));
const PACKAGE_TSCONFIG = /^packages\/[^/]+\/tsconfig\.json$/;
const IN_PACKAGE = /^packages\//;
const KIND_INCLUDE = ['${configDir}/src'];

export const PACKAGE_RULE =
  'a package holds one tsconfig.json, exactly { "extends": "../../tsconfig.<kind>.json" }';
export const KIND_RULE =
  'a kind config extends only ./tsconfig.base.json and includes only ["${configDir}/src"]';
export const NO_ROOT_PROGRAM = 'no root tsconfig.json: each package names its kind';

/** True for `tsconfig.<kind>.json` at the root. */
export const isKindConfig = (path) => KIND_FILES.has(path);

/** True for an extends that names a root kind config from `path`'s folder. */
export const namesKind = (base, rootPath) => KIND_FILES.has(rootPath) && base.startsWith('.');

const isOneLine = (config) => {
  const keys = Object.keys(config);
  const kind = KINDS.find((name) => config.extends === `../../tsconfig.${name}.json`);
  return keys.length === 1 && kind !== undefined;
};

const packageShape = (path, config) =>
  PACKAGE_TSCONFIG.test(path) && isOneLine(config) ? [] : [PACKAGE_RULE];

const kindShape = (config) =>
  config.extends === './tsconfig.base.json' && isDeepStrictEqual(config.include, KIND_INCLUDE)
    ? []
    : [KIND_RULE];

const SHAPES = [
  { applies: (path) => IN_PACKAGE.test(path), check: packageShape },
  { applies: isKindConfig, check: (_, config) => kindShape(config) },
  { applies: (path) => path === 'tsconfig.json', check: () => [NO_ROOT_PROGRAM] },
];

/** The ways the tsconfig at `path` breaks the package, kind or root shape. */
export const shapeViolations = (path, config) =>
  SHAPES.filter((shape) => shape.applies(path)).flatMap((shape) => shape.check(path, config));
