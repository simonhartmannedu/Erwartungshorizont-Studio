import type { KeyboardEvent, MutableRefObject } from "react";
import { ArchiveIcon, CheckIcon, DashboardIcon, GroupIcon, HomeIcon, LoadingIcon, PlusIcon, SaveIcon } from "../components/icons";

export type AppTabId = "home" | "guidedBuilder" | "builder" | "groups" | "archive" | "backup";

export const tabs: { id: AppTabId; label: string }[] = [
  { id: "home", label: "Übersicht" },
  { id: "groups", label: "Lerngruppen" },
  { id: "guidedBuilder", label: "EWH erstellen" },
  { id: "builder", label: "EWH-Editor" },
  { id: "archive", label: "EWH-Archiv" },
  { id: "backup", label: "Backup" },
];

export const getTabButtonId = (tabId: AppTabId) => `app-tab-${tabId}`;
export const getTabPanelId = (tabId: AppTabId) => `app-tabpanel-${tabId}`;

export const TabIcon = ({ id }: { id: AppTabId }) => {
  switch (id) {
    case "home":
      return <HomeIcon />;
    case "guidedBuilder":
      return <PlusIcon />;
    case "builder":
      return <DashboardIcon />;
    case "groups":
      return <GroupIcon />;
    case "archive":
      return <ArchiveIcon />;
    case "backup":
      return <SaveIcon />;
  }
};

type AppNavigationProps = {
  activeTab: AppTabId;
  onSelectTab: (tabId: AppTabId) => void;
  onTabKeyDown: (event: KeyboardEvent<HTMLButtonElement>, tabId: AppTabId) => void;
  localSaveState: "saving" | "saved" | "failed";
  tabButtonRefs: MutableRefObject<Record<AppTabId, HTMLButtonElement | null>>;
};

/** Static primary navigation; all navigation state and commands stay in App. */
export const AppNavigation = ({
  activeTab,
  onSelectTab,
  onTabKeyDown,
  localSaveState,
  tabButtonRefs,
}: AppNavigationProps) => (
  <div className="mb-6 no-print">
    <div className="flex min-w-0 flex-col gap-2 py-1 sm:flex-row sm:items-center sm:gap-3">
      <div role="tablist" aria-label="Hauptbereiche" className="flex min-w-0 gap-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={getTabButtonId(tab.id)}
            ref={(element) => {
              tabButtonRefs.current[tab.id] = element;
            }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={getTabPanelId(tab.id)}
            tabIndex={activeTab === tab.id ? 0 : -1}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            onKeyDown={(event) => onTabKeyDown(event, tab.id)}
            className={`${activeTab === tab.id ? "button-primary" : "button-secondary"} shrink-0 gap-2 whitespace-nowrap`}
          >
            <TabIcon id={tab.id} />
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className={`local-save-status local-save-status-${localSaveState} shrink-0 self-start sm:ml-auto sm:self-auto sm:border-l sm:pl-4`}
        role="status"
        aria-live="polite"
        title="Änderungen werden automatisch und nur in diesem Browser gespeichert. Ein verschlüsseltes Backup erstellst du im Bereich Backup."
      >
        {localSaveState === "saving" ? <LoadingIcon className="local-save-status-spinner" /> : localSaveState === "saved" ? <CheckIcon /> : <SaveIcon />}
        <span>
          {localSaveState === "saving"
            ? "Speichert lokal …"
            : localSaveState === "saved"
              ? "Lokal gespeichert"
              : "Lokales Speichern fehlgeschlagen"}
        </span>
      </div>
    </div>
  </div>
);
