import { posix } from 'node:path';

/** End (exclusive) of the `{…}` object that opens at `start`, braces inside strings skipped. */
function objectEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i += 1;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth += 1;
    else if (c === '}' && (depth -= 1) === 0) return i + 1;
  }
  return text.length;
}

/** The workspace folders a root `knip.json` configures (`"apps/api": {`), without `.`. */
function workspaces(text: string): { dir: string; start: number }[] {
  const at = text.indexOf('"workspaces"');
  if (at < 0) return [];
  const re = /"([^"]+)"\s*:\s*\{/g;
  re.lastIndex = text.indexOf('{', at) + 1;
  const out: { dir: string; start: number }[] = [];
  const end = objectEnd(text, re.lastIndex - 1);
  for (let m = re.exec(text); m !== null && m.index < end; m = re.exec(text)) {
    const start = m.index + m[0].length - 1;
    if (m[1] !== undefined && m[1] !== '.') out.push({ dir: m[1], start });
    re.lastIndex = objectEnd(text, start);
  }
  return out;
}

/**
 * The root `knip.json` names files relative to their workspace (`"src/main.ts"` under `"apps/api"`):
 * a move inside that workspace rewrites those exact strings, only inside the workspace's own block.
 */
export function rewriteKnipWorkspaces(text: string, pairs: [string, string][]): string {
  let out = text;
  for (const ws of workspaces(text).reverse()) {
    const pre = `${ws.dir}/`;
    const inside = new Map(
      pairs.filter(([f, t]) => f.startsWith(pre) && t.startsWith(pre)).map(([f, t]) => [f.slice(pre.length), t.slice(pre.length)]),
    );
    if (inside.size === 0) continue;
    const end = objectEnd(out, ws.start);
    const block = out.slice(ws.start, end).replace(/"([^"]*)"/g, (all, s: string) => {
      const to = inside.get(posix.normalize(s));
      return to === undefined ? all : `"${to}"`;
    });
    out = out.slice(0, ws.start) + block + out.slice(end);
  }
  return out;
}
