import { useState } from "react";
import type { Exam, StudentDatabase, StudentRecord } from "../types";
import { getCorrectionCheck } from "../utils/correctionReview";
import { getStudentAssessment } from "../utils/students";
import { Card } from "./ui";

type Props = {
  exam: Exam;
  database: StudentDatabase;
  workspaceId: string;
  students: StudentRecord[];
  activeStudentId: string;
  locked: boolean;
  onUnlock: () => void;
  onOpen: (studentId: string, taskId?: string) => void;
  onConfirm: (studentId: string) => void;
  onReopen: (studentId: string) => void;
};

export const CorrectionChecklist = ({ exam, database, workspaceId, students, activeStudentId, locked, onUnlock, onOpen, onConfirm, onReopen }: Props) => {
  const [collapsed, setCollapsed] = useState(true);
  if (locked) return <Card title="Abschlussprüfung" className="no-print"><p className="themed-muted text-sm">Entsperre die Lerngruppe, um fehlende Eingaben und Prüfhinweise zu sehen.</p><button type="button" className="button-secondary mt-3" onClick={onUnlock}>Für Abschlussprüfung entsperren</button></Card>;

  const rows = students.map((student) => ({ student, check: getCorrectionCheck(exam, getStudentAssessment(database, student.id, workspaceId)) }));
  const active = rows.find((row) => row.student.id === activeStudentId);
  const pending = rows.filter((row) => !row.check.complete);
  const firstTask = (check: ReturnType<typeof getCorrectionCheck>) =>
    check.invalidTaskIds[0] ?? check.missingTaskIds[0] ?? check.changedTaskIds[0] ?? check.unverifiedTaskIds[0];
  const next = pending.find((row) => row.student.id !== activeStudentId) ?? pending[0];
  const missingCount = rows.reduce((total, row) => total + row.check.missingTaskIds.length, 0);
  const changedCount = rows.reduce((total, row) => total + row.check.changedTaskIds.length, 0);
  const describe = (check: ReturnType<typeof getCorrectionCheck>) => {
    if (check.complete) return check.participates ? "Abschluss geprüft" : "Keine Teilnahme · berücksichtigt";
    if (check.participationConflict) return "Keine Teilnahme, aber Bewertungen oder Kommentar vorhanden";
    if (check.invalidTaskIds.length) return `${check.invalidTaskIds.length} Punkteingaben außerhalb des gültigen Bereichs`;
    if (check.missingTaskIds.length) return `${check.missingTaskIds.length} fehlende Punkteingaben`;
    if (check.changedTaskIds.length) return `${check.changedTaskIds.length} Bewertungen nach Änderung der Rubrik oder des Notenschlüssels prüfen`;
    if (check.unverifiedTaskIds.length) return "Bewertungsgrundlage noch nicht bestätigt";
    return "Abschließende Durchsicht offen";
  };

  return <Card title="Abschlussprüfung" subtitle={pending.length === 0 ? "Alle Arbeiten geprüft." : `${pending.length} von ${rows.length} Arbeiten noch zu prüfen · ${missingCount} fehlende Eingaben · ${changedCount} Bewertungen nach Rubrikänderung`} className="no-print" collapsible collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)}>
    <div className="grid min-w-0 gap-4">
      <p className="themed-strong text-sm" role="status">{pending.length === 0 ? "Alle Arbeiten geprüft." : `${pending.length} von ${rows.length} Arbeiten noch zu prüfen · ${missingCount} fehlende Eingaben · ${changedCount} Bewertungen nach Rubrikänderung`}</p>
      {active ? <div className="surface-muted rounded-xl border p-3" aria-label={`Abschlussprüfung für ${active.student.alias}`}>
        <p className="themed-strong text-sm font-semibold">{active.student.alias}: {describe(active.check)}</p>
        {active.check.unverifiedTaskIds.length > 0 ? <p className="themed-muted mt-2 text-sm">Ältere Bewertungen haben noch keinen gespeicherten Prüfstand. Bestätige ihre Grundlage nach der Durchsicht.</p> : null}
        {active.check.participationConflict ? <p className="themed-muted mt-2 text-sm">Prüfe die Teilnahme. Wenn der Ausschluss richtig ist, bestätige ihn; vorhandene Bewertungen bleiben erhalten und werden nicht in die Auswertung einbezogen.</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {firstTask(active.check) || active.check.participationConflict ? <button type="button" className="button-secondary" onClick={() => onOpen(active.student.id, firstTask(active.check))}>Offene Stelle anzeigen</button> : null}
          {active.check.complete ? <button type="button" className="button-secondary" onClick={() => onReopen(active.student.id)} disabled={!active.check.participates}>Zweite Durchsicht vormerken</button> : <button type="button" className="button-primary" disabled={!active.check.canConfirm} onClick={() => onConfirm(active.student.id)}>{active.check.participates ? "Bewertungen geprüft" : "Ausschluss geprüft"}</button>}
        </div>
      </div> : null}
      <button type="button" className="button-secondary justify-self-start" disabled={!next} onClick={() => next && onOpen(next.student.id, firstTask(next.check))}>Nächste offene Arbeit</button>
      <details className="min-w-0 rounded-xl border p-3">
        <summary className="themed-strong cursor-pointer text-sm font-semibold">Prüfliste der Lerngruppe ({rows.length})</summary>
        <ul className="mt-3 space-y-2">
          {rows.map(({ student, check }) => <li key={student.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm">
            <span className="min-w-0 break-words"><strong>{student.alias}</strong><span className="themed-muted block">{describe(check)}</span></span>
            <button type="button" className="button-secondary shrink-0 px-2 py-1 text-xs" aria-label={`${student.alias} zur Prüfung öffnen`} onClick={() => onOpen(student.id, firstTask(check))}>Öffnen</button>
          </li>)}
        </ul>
      </details>
      <p className="themed-muted text-xs leading-5">Leere Felder bleiben offen. Null Punkte gelten erst nach ausdrücklicher Eingabe als erfasst. Der Prüfvermerk wird bei Änderungen an Punkten, Kommentar oder Bewertungsgrundlage wieder offen.</p>
    </div>
  </Card>;
};
