// Find an accepted student (bundle.earlier) from what another sheet row knows: a phone, a name in
// any spelling (A1), maybe a teacher. Pure. Exact normalized name beats similar; >1 = ambiguous.
import { arabicNameSimilar } from '@ab/shared';
import { personName } from '../../keys.ts';
import type { Desired } from '../../plan/resolve.ts';
import { latinMatchesArabic } from './translit.ts';

export interface StudentIndex {
  all: readonly Desired[];
  byPhone: ReadonlyMap<string, readonly Desired[]>;
}

export function studentIndex(students: readonly Desired[] | undefined): StudentIndex {
  const byPhone = new Map<string, Desired[]>();
  for (const s of students ?? []) {
    const phone = s.record.refs['guardian_id']?.key;
    if (phone) byPhone.set(phone, [...(byPhone.get(phone) ?? []), s]);
  }
  return { all: students ?? [], byPhone };
}

type Found =
  { ok: true; student: Desired } | { ok: false; reason: 'not_found' | 'ambiguous' };

interface StudentQuery {
  phone?: string | null;
  name?: string | null;
  /** keys.teacher slug: narrows a phone-less search (old report rows). */
  teacher?: string | null;
}

const nameOf = (s: Desired): string => personName(String(s.record.columns['name'] ?? ''));
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

function byPhone(ix: StudentIndex, phone: string, name: string | null): Found {
  const cands = ix.byPhone.get(phone) ?? [];
  const named = name ? byName(cands, name) : null;
  if (named) return named;
  const latin = name !== null && !ARABIC.test(name);
  // Latin names (HEART, FIN) against the Arabic registry: consonant skeletons pick the child.
  const hits = latin ? cands.filter((s) => latinMatchesArabic(name, nameOf(s))) : [];
  const [only] = hits.length === 1 ? hits : cands;
  // One child on the phone: accept unless an Arabic name clearly names someone else.
  if ((hits.length === 1 || cands.length === 1) && only && (latin || !name))
    return { ok: true, student: only };
  return { ok: false, reason: cands.length > 1 ? 'ambiguous' : 'not_found' };
}

export function findStudent(ix: StudentIndex, q: StudentQuery): Found {
  if (q.phone) return byPhone(ix, q.phone, q.name ?? null);
  if (!q.name) return { ok: false, reason: 'not_found' };
  const teacher = q.teacher;
  const tiers = teacher
    ? [ix.all.filter((s) => s.record.refs['teacher_id']?.key === teacher), ix.all]
    : [ix.all];
  for (const cands of tiers) {
    const r = byName(cands, q.name);
    if (r) return r;
  }
  return { ok: false, reason: 'not_found' };
}
