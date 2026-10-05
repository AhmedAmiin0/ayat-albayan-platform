import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Test helper (not a test): finds every HTTP route declared in the API's controllers by reading
// the source, so the route-coverage test needs no running app.

export interface ScannedRoute {
  file: string;
  method: string;
  /** Pattern with `:params`, e.g. `/students/:id/balance`. */
  path: string;
  roles: string[] | null;
  isPublic: boolean;
  requiresPermission: boolean;
}

const HTTP = /^\s*@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?/;
const ROLES = /@Roles\(([^)]*)\)/;
const SIGNATURE = /^\s+(?:async\s+)?[A-Za-z_]\w*\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return e.name.endsWith('.ts') && !e.name.includes('.test.') ? [full] : [];
  });
}

const rolesOf = (line: string): string[] | null => {
  const m = ROLES.exec(line);
  return m ? [...(m[1] ?? '').matchAll(/'([a-z]+)'/g)].map((x) => x[1] ?? '') : null;
};

export function scanFile(file: string, text: string): ScannedRoute[] {
  const out: ScannedRoute[] = [];
  let base = '';
  let classRoles: string[] | null = null;
  let classPublic = false;
  let classPerm = false;
  let block: string[] = [];
  for (const line of text.split('\n')) {
    const ctl = /^@Controller\(\s*(?:'([^']*)')?/.exec(line);
    if (ctl) base = ctl[1] ?? '';
    if (/^@(Roles|Public|RequirePermission)\(/.test(line)) {
      classRoles = rolesOf(line) ?? classRoles;
      classPublic ||= line.startsWith('@Public(');
      classPerm ||= line.startsWith('@RequirePermission(');
    }
    if (/^\s+@(Get|Post|Put|Patch|Delete|Roles|Public|RequirePermission)\(/.test(line)) block.push(line);
    else if (SIGNATURE.test(line) && block.length > 0) {
      const http = block.map((l) => HTTP.exec(l)).find((m) => m !== null);
      if (http) {
        const path = `/${[base, http[2] ?? ''].filter(Boolean).join('/')}`;
        const own = block.map(rolesOf).find((r) => r !== null) ?? null;
        out.push({
          file,
          method: (http[1] ?? '').toUpperCase(),
          path,
          roles: own ?? classRoles,
          isPublic: classPublic || block.some((l) => l.trim().startsWith('@Public(')),
          requiresPermission: classPerm || block.some((l) => l.trim().startsWith('@RequirePermission(')),
        });
      }
      block = [];
    }
  }
  return out;
}

export function scanControllers(root: string): ScannedRoute[] {
  return sourceFiles(root)
    .map((f) => ({ f, text: readFileSync(f, 'utf8') }))
    .filter(({ text }) => /^@Controller\(/m.test(text))
    .flatMap(({ f, text }) => scanFile(f, text));
}
