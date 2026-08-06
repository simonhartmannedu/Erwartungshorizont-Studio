import type { KeyboardEvent, MutableRefObject } from "react";
import { ArchiveIcon, DashboardIcon, GroupIcon, HomeIcon, PlusIcon, SaveIcon } from "../components/icons";

export type AppTabId = "home" | "guidedBuilder" | "builder" | "groups" | "archive" | "backup";

export const tabs: { id: AppTabId; label: string }[] = [
  { id: "home", label: "Übersicht" },
  { id: "groups", label: "Lerngruppen" },
  { id: "guidedBuilder", label: "EWH-Templates" },
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
  onSaveToArchive: () => void;
  tabButtonRefs: MutableRefObject<Record<AppTabId, HTMLButtonElement | null>>;
};

/** Static primary navigation; all navigation state and commands stay in App. */
export const AppNavigation = ({
  activeTab,
  onSelectTab,
  onTabKeyDown,
  onSaveToArchive,
  tabButtonRefs,
}: AppNavigationProps) => (
  <div className="mb-6 no-print">
    <div className="flex gap-3 overflow-x-auto py-1">
      <div role="tablist" aria-label="Hauptbereiche" className="flex gap-3">
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
      <button
        type="button"
        onClick={onSaveToArchive}
        className="button-secondary ml-auto shrink-0 gap-2 whitespace-nowrap border-l pl-4"
      >
        <SaveIcon />
        Im Archiv speichern
      </button>
    </div>
  </div>
);
