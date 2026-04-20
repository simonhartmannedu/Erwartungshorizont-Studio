import { ExamMeta } from "../types";
import { Field } from "./ui";

interface Props {
  meta: ExamMeta;
  onChange: <K extends keyof ExamMeta>(key: K, value: ExamMeta[K]) => void;
  disabled?: boolean;
}

export const ExamHeaderForm = ({ meta, onChange, disabled = false }: Props) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Field label="Schuljahr">
      <input className="field" value={meta.schoolYear} disabled={disabled} onChange={(e) => onChange("schoolYear", e.target.value)} />
    </Field>
    <Field label="Jahrgang">
      <input className="field" value={meta.gradeLevel} disabled={disabled} onChange={(e) => onChange("gradeLevel", e.target.value)} />
    </Field>
    <Field label="Kurs / Klasse">
      <input className="field" value={meta.course} disabled={disabled} onChange={(e) => onChange("course", e.target.value)} />
    </Field>
    <Field label="Lehrkraft">
      <input className="field" value={meta.teacher} disabled={disabled} onChange={(e) => onChange("teacher", e.target.value)} />
    </Field>
    <Field label="Datum">
      <input className="field" type="date" value={meta.examDate} disabled={disabled} onChange={(e) => onChange("examDate", e.target.value)} />
    </Field>
    <Field label="Titel der Klassenarbeit">
      <input className="field" value={meta.title} disabled={disabled} onChange={(e) => onChange("title", e.target.value)} />
    </Field>
    <Field label="Thema / Unit">
      <input className="field" value={meta.unit} disabled={disabled} onChange={(e) => onChange("unit", e.target.value)} />
    </Field>
    <Field label="Hinweise">
      <textarea className="field min-h-24" value={meta.notes} disabled={disabled} onChange={(e) => onChange("notes", e.target.value)} />
    </Field>
  </div>
);
