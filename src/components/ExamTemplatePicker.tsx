import { useState } from "react";
import { ExamTemplateDefinition } from "../data/templates";
import { ExamTemplatePreviewCard } from "./ExamTemplatePreviewCard";
import { ChevronDownIcon, ChevronRightIcon } from "./icons";
import { Card, IconButton } from "./ui";

interface Props {
  templates: ExamTemplateDefinition[];
  onLoad: (template: ExamTemplateDefinition) => void;
}

export const ExamTemplatePicker = ({ templates, onLoad }: Props) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card
      title="Klausur-Vorlagen"
      subtitle="Vollständige Klassenarbeiten mit Teil A, B und C. Beim Laden wird der aktuelle Bewertungsbogen vollständig ersetzt."
      actions={
        <div className="control-shell inline-flex items-center gap-1 rounded-full border p-1">
          <IconButton onClick={() => setCollapsed((current) => !current)} title={collapsed ? "Aufklappen" : "Zuklappen"} className="px-2.5 py-2 text-xs">
            {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </IconButton>
        </div>
      }
    >
      {!collapsed && (
        <>
          <div className="subsection-copy mb-4 max-w-3xl text-sm leading-6">
            Die Vorlagen liefern eine sofort einsatzfähige Gesamtstruktur. Danach bleiben alle Bereiche, Aufgaben,
            Unteraufgaben, Erwartungshorizonte, Punkte und Gewichtungen frei bearbeitbar, löschbar und umsortierbar.
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {templates.map((template) => (
              <ExamTemplatePreviewCard key={template.id} template={template} onLoad={() => onLoad(template)} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
};
