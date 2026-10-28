# New lesson report form (design, approved)

Owner, 2026-10-26: «Make a new form to replace the teacher report form» → «design a better one» with
all four goals: faster to fill, memorization tracked by surah and ayah, content per program, and a
better report for the family. Old reports stay as they are. Owner, 2026-10-28: «do what you
recommend» → go.

Artboards (Design Component pages, 390 px phone frames, RTL):

| File | What it shows |
|---|---|
| `Main.dc.html` | The teacher's form for a Quran lesson, attended (interactive: attendance and program switch) |
| `SurahPicker.dc.html` | The sheet that picks a surah and the ayah range (from/to steppers, starts after the last saved ayah) |
| `Arabic.dc.html` | The same form for the Arabic program (imports `Main` with `program="arabic"`) |
| `Islamic.dc.html` | The same form for Islamic studies (`program="islamic"`, attendance late) |
| `Absent.dc.html` | The form when the student was absent (`attendance="absent"`) |
| `ParentReport.dc.html` | The report the family receives: what was done (recitation / new / revision with a grade each), overall grade, memorization progress in the juz, homework, the teacher's note, next lesson, lessons left |
| `canvas.json` | The canvas index (frames and titles) |

Names and codes in the artboards are samples, not real people.
