import { KeyboardEvent, useRef } from "react";

export type EditorSectionTabId = "setup" | "tasks" | "result";

const editorSectionTabs: { id: EditorSectionTabId; label: string; description: string }[] = [
  { id: "setup", label: "Rahmendaten", description: "Metadaten, Punkte und Noten" },
  { id: "tasks", label: "Bewertung", description: "Abschnitte und Unteraufgaben" },
  { id: "result", label: "Ergebnis & Druck", description: "Note, Kommentar und Unterschrift" },
];

export const getEditorSectionTabId = (tabId: EditorSectionTabId) => `ewh-editor-tab-${tabId}`;
export const getEditorSectionPanelId = (tabId: EditorSectionTabId) => `ewh-editor-panel-${tabId}`;

export const EditorSectionTabs = ({
  activeTab,
  onSelectTab,
}: {
  activeTab: EditorSectionTabId;
  onSelectTab: (tabId: EditorSectionTabId) => void;
}) => {
  const buttonRefs = useRef<Record<EditorSectionTabId, HTMLButtonElement | null>>({
    setup: null,
    tasks: null,
    result: null,
  });

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: EditorSectionTabId) => {
    const currentIndex = editorSectionTabs.findIndex((tab) => tab.id === tabId);
    const targetIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % editorSectionTabs.length
        : event.key === "ArrowLeft"
          ? (currentIndex - 1 + editorSectionTabs.length) % editorSectionTabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? editorSectionTabs.length - 1
              : -1;

    if (targetIndex === -1) return;

    event.preventDefault();
    const targetTab = editorSectionTabs[targetIndex]!;
    onSelectTab(targetTab.id);
    buttonRefs.current[targetTab.id]?.focus();
  };

  return (
    <div className="editor-section-tabs no-print" role="tablist" aria-label="Bereiche des EWH-Editors">
      {editorSectionTabs.map((tab) => (
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
