// Find an accepted student (bundle.earlier) from what another sheet row knows: a phone, a name in
// any spelling (A1), maybe a teacher. Pure. Exact normalized name beats similar; >1 = ambiguous.
import { arabicNameSimilar } from '@ab/core';
import { personName } from '../../keys.ts';
import type { Desired } from '../../plan/resolve.ts';
import { latinMatchesArabic } from './translit.ts';

export interface StudentIndex {
  all: readonly Desired[];
  byPhone: ReadonlyMap<string, readonly Desired[]>;
}

export function studentIndex(students: readonly Desired[] | undefined): StudentIndex {
  const all = students ?? [];
  const byPhone = new Map<string, Desired[]>();
  for (const s of all) {
    const phone = s.record.refs.guardian_id?.key;
    if (phone) byPhone.set(phone, [...(byPhone.get(phone) ?? []), s]);
  }
  return { all, byPhone };
}

type Found = { ok: true; student: Desired } | { ok: false; reason: 'not_found' | 'ambiguous' };

interface StudentQuery {
  phone?: string | null;
  name?: string | null;
  /** keys.teacher slug: narrows a phone-less search (old report rows). */
  teacher?: string | null;
}

const nameOf = (s: Desired): string => personName(String(s.record.columns.name ?? ''));
/** The registry name first, then the spellings of rows merged into it by AB code. */
const namesOf = (s: Desired): string[] => [nameOf(s), ...(s.record.aliases ?? []).map(personName)];
const ARABIC = /[؀-ۿ]/;

/** exact → similar; the first criterion with exactly one hit wins, more than one is ambiguous. */
function byName(cands: readonly Desired[], name: string): Found | null {
  const want = personName(name);
  for (const pred of [
    (s: Desired) => namesOf(s).includes(want),
    (s: Desired) => namesOf(s).some((n) => arabicNameSimilar(n, want)),
  ]) {
    const hits = cands.filter(pred);
    if (hits.length > 1) return { ok: false, reason: 'ambiguous' };
    const [hit] = hits;
    if (hit) return { ok: true, student: hit };
  }
  return null;
}

function soleChild(cands: readonly Desired[], hits: readonly Desired[]): Desired | undefined {
  const [only] = hits.length === 1 ? hits : cands;
  return hits.length === 1 || cands.length === 1 ? only : undefined;
}

const latinOf = (name: string | null): string | null =>
  name !== null && !ARABIC.test(name) ? name : null;

function bySkeleton(cands: readonly Desired[], name: string | null): Found | null {
  const latin = latinOf(name);
  // Latin names (HEART, FIN) against the Arabic registry: consonant skeletons pick the child.
  const hits = latin === null ? [] : cands.filter((s) => latinMatchesArabic(latin, nameOf(s)));
  const only = soleChild(cands, hits);
  // One child on the phone: accept unless an Arabic name clearly names someone else.
  const accepts = latin !== null || !name;
  return only && accepts ? { ok: true, student: only } : null;
}

const unmatched = (cands: readonly Desired[]): Found => ({
  ok: false,
  reason: cands.length > 1 ? 'ambiguous' : 'not_found',
});

function byPhone(ix: StudentIndex, phone: string, name: string | null): Found {
  const cands = ix.byPhone.get(phone) ?? [];
  const named = name ? byName(cands, name) : null;
  return named ?? bySkeleton(cands, name) ?? unmatched(cands);
}

const nameTiers = (ix: StudentIndex, teacher: string | null | undefined): (readonly Desired[])[] =>
  teacher ? [ix.all.filter((s) => s.record.refs.teacher_id?.key === teacher), ix.all] : [ix.all];

export function findStudent(ix: StudentIndex, q: StudentQuery): Found {
  if (q.phone) return byPhone(ix, q.phone, q.name ?? null);
  if (!q.name) return { ok: false, reason: 'not_found' };
  for (const cands of nameTiers(ix, q.teacher)) {
    const r = byName(cands, q.name);
    if (r) return r;
  }
  return { ok: false, reason: 'not_found' };
}
