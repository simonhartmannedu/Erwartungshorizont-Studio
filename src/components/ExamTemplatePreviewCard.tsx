import { ExamTemplateDefinition } from "../data/templates";
import { Badge, Card } from "./ui";
import { TemplateIcon } from "./icons";

interface Props {
  template: ExamTemplateDefinition;
  onLoad: () => void;
}

export const ExamTemplatePreviewCard = ({ template, onLoad }: Props) => (
  <Card
    title={template.title}
    subtitle={template.description}
    className="template-preview-card h-full"
    actions={<Badge tone="amber">Komplette Vorlage</Badge>}
  >
    <div className="space-y-4">
      <p className="subsection-copy text-sm leading-6">{template.pedagogicalHint}</p>
      <div className="template-preview-list space-y-3 rounded-3xl border p-4">
        {template.previewSections.map((section) => (
          <div key={section.title} className="template-preview-item rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="themed-strong font-semibold">{section.title}</p>
              <span className="themed-muted text-xs font-semibold uppercase tracking-[0.14em]">
                {section.points} P.
              </span>
            </div>
            <p className="subsection-copy mt-2 text-sm">{section.tasks.join(" · ")}</p>
          </div>
        ))}
      </div>
      <button type="button" className="button-primary w-full gap-2" onClick={onLoad}>
        <TemplateIcon />
        Vorlage laden
      </button>
    </div>
  </Card>
);
