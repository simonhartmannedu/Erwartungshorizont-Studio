import { ExamMeta } from "../types";
import { Field, TextAreaField } from "./ui";

interface Props {
  meta: ExamMeta;
  onChange: <K extends keyof ExamMeta>(key: K, value: ExamMeta[K]) => void;
  disabled?: boolean;
  showNotesListTransform?: boolean;
}

export const ExamHeaderForm = ({ meta, onChange, disabled = false, showNotesListTransform = true }: Props) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Field label="Schuljahr">
      <input className="field" value={meta.schoolYear} placeholder="Hier Schuljahr eintragen" disabled={disabled} onChange={(e) => onChange("schoolYear", e.target.value)} />
    </Field>
    <Field label="Fach">
      <input className="field" value={meta.subject} placeholder="Hier Fach eintragen" disabled={disabled} onChange={(e) => onChange("subject", e.target.value)} />
    </Field>
    <Field label="Jahrgang">
      <input className="field" value={meta.gradeLevel} placeholder="Hier Jahrgang eintragen" disabled={disabled} onChange={(e) => onChange("gradeLevel", e.target.value)} />
    </Field>
    <Field label="Kurs / Klasse">
      <input className="field" value={meta.course} placeholder="Hier Kurs oder Klasse eintragen" disabled={disabled} onChange={(e) => onChange("course", e.target.value)} />
    </Field>
    <Field label="Lehrkraft">
      <input className="field" value={meta.teacher} placeholder="Hier Lehrkraft eintragen" disabled={disabled} onChange={(e) => onChange("teacher", e.target.value)} />
    </Field>
    <Field label="Datum (hier eintragen)">
      <input className="field" type="date" value={meta.examDate} disabled={disabled} onChange={(e) => onChange("examDate", e.target.value)} />
    </Field>
    <Field label="Titel der Klassenarbeit">
      <input className="field" value={meta.title} placeholder="Hier Titel eintragen" disabled={disabled} onChange={(e) => onChange("title", e.target.value)} />
    </Field>
    <Field label="Thema / Unit">
      <input className="field" value={meta.unit} placeholder="Hier Thema oder Unit eintragen" disabled={disabled} onChange={(e) => onChange("unit", e.target.value)} />
    </Field>
    <Field label="Hinweise">
      <TextAreaField
        className="min-h-24"
        value={meta.notes}
        placeholder="Hier Hinweise eintragen"
        disabled={disabled}
        showListTransform={showNotesListTransform}
        onValueChange={(value) => onChange("notes", value)}
      />
    </Field>
  </div>
);
