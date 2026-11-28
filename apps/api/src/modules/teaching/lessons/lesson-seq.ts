/** Lesson ids per v_lesson_sequence read: the ids go into the URL, which must stay short. */
const SEQ_CHUNK = 100;

interface SeqRow {
  lesson_id: string | null;
  student_id: string | null;
  seq: number | null;
}

export function seqChunks(ids: readonly string[]): string[][] {
  return Array.from({ length: Math.ceil(ids.length / SEQ_CHUNK) }, (_, i) =>
    ids.slice(i * SEQ_CHUNK, (i + 1) * SEQ_CHUNK),
  );
}

/** `lesson_id:student_id` to the lesson number; a row without all three is left out. */
export function seqMap(rows: readonly SeqRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.lesson_id || !r.student_id || r.seq === null) continue;
    out.set(`${r.lesson_id}:${r.student_id}`, r.seq);
  }
  return out;
}
