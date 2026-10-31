import { readSettings, SETTING_KEYS, type ConfigParityDiff, type ConfigParityResponse } from '@ab/shared';
import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { isDeepStrictEqual } from 'node:util';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { decodeAll, GATE_KEYS } from '@/common/configuration/config-store/store/config-decode';
import { isBaseAdmin } from './config-ownership';
import { ConfigStore } from '@/common/configuration/config-store/store/config-store.service';

type Rows = readonly { key: string; value: unknown }[];

/** docs/26 §4 rules 3 and 4: what a stored value must read as on BOTH paths. */
function ruleValue(key: string, stored: unknown): unknown {
  if (GATE_KEYS.has(key)) return stored === true;
  return stored === 'module' ? 'module' : 'legacy';
}

const RULE_KEYS = [...GATE_KEYS, 'comms_source'];

interface ParitySides {
  legacy: Readonly<Record<string, unknown>>;
  store: Readonly<Record<string, unknown>>;
  rows: Rows;
}

/**
 * Registry keys whose two effective values differ (deep equality); then the fail-closed rules,
 * reported as `rule:<key>` with both values when either path breaks them.
 */
export function compareEffective(sides: ParitySides): ConfigParityDiff[] {
  const { legacy, store } = sides;
  const diffs: ConfigParityDiff[] = SETTING_KEYS.filter((k) => !isDeepStrictEqual(legacy[k], store[k])).map((key) => ({
    key,
    legacy: legacy[key],
    store: store[key],
  }));
  const stored = new Map(sides.rows.map((r) => [r.key, r.value]));
  for (const key of RULE_KEYS) {
    const want = ruleValue(key, stored.get(key));
    if (legacy[key] !== want || store[key] !== want) diffs.push({ key: `rule:${key}`, legacy: legacy[key], store: store[key] });
  }
  return diffs;
}

/** The legacy effective values (readSettings over the rows) vs ConfigStore's decode of the SAME rows. */
export function configParity(rows: Rows): ConfigParityResponse {
  const diffs = compareEffective({ legacy: readSettings(rows), store: decodeAll(rows), rows });
  return { diffs, checkedKeys: SETTING_KEYS.length };
}

/**
 * GET /admin/config/parity (docs/26 §4 «Parity»): run on staging and in CI on the e2e database; the
 * read switch waits for ≥ 1 week of empty `diffs`. Uncached rows, one select for both sides. Base admin.
 */
@ApiTags('config')
@ApiBearerAuth()
@Permissions('settings.read')
@Controller('admin/config/parity')
export class ConfigParityController {
  constructor(private readonly store: ConfigStore) {}

  @Get()
  async get(@CurrentUser() user: AuthUser): Promise<ConfigParityResponse> {
    if (!isBaseAdmin(user)) throw new ForbiddenException({ message: 'admin_only' });
    return configParity((await this.store.fresh()).rows);
  }
}
