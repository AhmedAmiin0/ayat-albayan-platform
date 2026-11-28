import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { parseJson } from '../../units/json.ts';
import { structureMapSchema, type StructureMap } from './map.schemas.ts';

export const MAP_FILE = 'refactor/structure/map.json';

export const readStructureMap = (root: string): StructureMap =>
  parseJson(readFileSync(posix.join(root, MAP_FILE), 'utf8'), structureMapSchema);
