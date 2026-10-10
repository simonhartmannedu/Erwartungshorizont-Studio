import { KeyboardEvent, useRef } from "react";

export type EditorSectionTabId = "setup" | "tasks" | "result";

const editorSectionTabs: { id: EditorSectionTabId; label: string; description: string }[] = [
  { id: "setup", label: "Vorbereiten", description: "Rahmendaten, Rubrik und Notenschlüssel" },
  { id: "tasks", label: "Korrigieren", description: "Punkte für die ausgewählte Schüler:in eingeben" },
  { id: "result", label: "Ergebnis & Druck", description: "Note, Kommentar und Unterschrift" },
];

export const getEditorSectionTabId = (tabId: EditorSectionTabId) => `ewh-editor-tab-${tabId}`;
export const getEditorSectionPanelId = (tabId: EditorSectionTabId) => `ewh-editor-panel-${tabId}`;

export const EditorSectionTabs = ({
  activeTab,
  onSelectTab,
  easyMode = false,
}: {
  activeTab: EditorSectionTabId;
  onSelectTab: (tabId: EditorSectionTabId) => void;
  easyMode?: boolean;
}) => {
  const visibleEditorTabs = editorSectionTabs.map((tab) =>
    easyMode && tab.id === "tasks"
      ? { ...tab, label: "Überarbeiten", description: "Aufgaben, Erwartungshorizonte und Punkte bearbeiten" }
      : easyMode && tab.id === "result"
        ? { ...tab, label: "Drucken & Exportieren", description: "Fertigen Erwartungshorizont ausgeben" }
        : tab,
  );
  const buttonRefs = useRef<Record<EditorSectionTabId, HTMLButtonElement | null>>({
    setup: null,
    tasks: null,
    result: null,
  });

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: EditorSectionTabId) => {
    const currentIndex = visibleEditorTabs.findIndex((tab) => tab.id === tabId);
    const targetIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % visibleEditorTabs.length
        : event.key === "ArrowLeft"
          ? (currentIndex - 1 + visibleEditorTabs.length) % visibleEditorTabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
            ? visibleEditorTabs.length - 1
              : -1;

    if (targetIndex === -1) return;

    event.preventDefault();
    const targetTab = visibleEditorTabs[targetIndex]!;
    onSelectTab(targetTab.id);
    buttonRefs.current[targetTab.id]?.focus();
  };

  return (
    <div className="editor-section-tabs no-print" role="tablist" aria-label="Bereiche des EWH-Editors">
      {visibleEditorTabs.map((tab) => (
        <button
          key={tab.id}
          ref={(element) => {
            buttonRefs.current[tab.id] = element;
          }}
          id={getEditorSectionTabId(tab.id)}
          role="tab"
          type="button"
          aria-selected={activeTab === tab.id}
          aria-controls={getEditorSectionPanelId(tab.id)}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={`${activeTab === tab.id ? "button-primary" : "button-secondary"} shrink-0 px-4 py-2.5 text-sm`}
          title={tab.description}
          onClick={() => onSelectTab(tab.id)}
          onKeyDown={(event) => onKeyDown(event, tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
