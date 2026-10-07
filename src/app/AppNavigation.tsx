import { type KeyboardEvent, type MutableRefObject, useMemo, useState } from "react";
import { ArchiveIcon, CheckIcon, DashboardIcon, GroupIcon, HomeIcon, LoadingIcon, PlusIcon, SaveIcon, ScanIcon, SearchIcon, WizardIcon } from "../components/icons";
import type { GlobalSearchResult } from "./AppHeader";

export type AppTabId = "home" | "wizard" | "guidedBuilder" | "builder" | "groups" | "bogencheck" | "archive" | "backup";

/** Bogencheck remains implemented, but is not released in the primary navigation yet. */
/**
 * These are the durable destinations of the workspace. Creation and the
 * wizard remain available as contextual actions; making them top-level tabs
 * made the same job appear in three different places.
 */
export const tabs: { id: AppTabId; label: string }[] = [
  { id: "home", label: "Übersicht" },
  { id: "builder", label: "Klassenarbeiten" },
  { id: "groups", label: "Lerngruppen" },
  { id: "archive", label: "Archiv" },
  { id: "backup", label: "Backup" },
];

/** The compact workflow deliberately exposes only creating and finishing an EWH. */
export const easyModeTabs = tabs.filter((tab) => tab.id === "builder");
export const getVisibleTabs = (easyMode: boolean) => (easyMode ? easyModeTabs : tabs);

/** Contextual views keep their old state IDs for compatibility with existing calls. */
export const getNavigationTabId = (tabId: AppTabId): AppTabId =>
  tabId === "guidedBuilder" || tabId === "wizard" ? "builder" : tabId;

export const getTabButtonId = (tabId: AppTabId) => `app-tab-${tabId}`;
export const getTabPanelId = (tabId: AppTabId) => `app-tabpanel-${tabId}`;

export const TabIcon = ({ id }: { id: AppTabId }) => {
  switch (id) {
    case "home":
      return <HomeIcon />;
    case "wizard":
      return <WizardIcon />;
    case "guidedBuilder":
      return <PlusIcon />;
    case "builder":
      return <DashboardIcon />;
    case "groups":
      return <GroupIcon />;
    case "bogencheck":
      return <ScanIcon />;
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
  searchResults: GlobalSearchResult[];
  sensitiveSearchSessionVersion: number;
  onSearchResultSelect: (resultId: string) => void;
  easyMode: boolean;
};

const GlobalSearch = ({
  searchResults,
  onSearchResultSelect,
}: Pick<AppNavigationProps, "searchResults" | "onSearchResultSelect">) => {
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("de-DE");
  const visibleSearchResults = useMemo(
    () =>
      normalizedQuery
        ? searchResults
            .filter((result) => `${result.label} ${result.detail}`.toLocaleLowerCase("de-DE").includes(normalizedQuery))
            .slice(0, 7)
        : [],
    [normalizedQuery, searchResults],
  );
  const selectSearchResult = (resultId: string) => {
    onSearchResultSelect(resultId);
    setSearchQuery("");
  };

  return (
    <div className="global-search global-search-navigation no-print">
      <div className="global-search-input-wrap">
        <span className="global-search-icon" aria-hidden="true">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          className="field header-control"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !visibleSearchResults[0]) return;
            event.preventDefault();
            selectSearchResult(visibleSearchResults[0].id);
          }}
          placeholder="Schüler:in oder Klassenarbeit suchen"
          aria-label="Schüler:innen und Klassenarbeiten durchsuchen"
          aria-controls="global-search-results"
          aria-expanded={visibleSearchResults.length > 0}
        />
      </div>
      {normalizedQuery ? (
        <div id="global-search-results" className="global-search-results" role="listbox" aria-label="Suchergebnisse">
          {visibleSearchResults.length > 0 ? (
            visibleSearchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                className="global-search-result"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSearchResult(result.id)}
              >
                <span className="global-search-result-kind">{result.kind === "student" ? "Schüler:in" : "Arbeit"}</span>
                <span className="global-search-result-copy">
                  <strong>{result.label}</strong>
                  <small>{result.detail}</small>
                </span>
              </button>
            ))
          ) : (
            <p className="global-search-empty">Keine Treffer für „{searchQuery.trim()}“</p>
          )}
        </div>
      ) : null}
    </div>
  );
};

/** Static primary navigation; all navigation state and commands stay in App. */
export const AppNavigation = ({
  activeTab,
  onSelectTab,
  onTabKeyDown,
  localSaveState,
  tabButtonRefs,
  searchResults,
  sensitiveSearchSessionVersion,
  onSearchResultSelect,
  easyMode,
}: AppNavigationProps) => {
  const navigationTab = getNavigationTabId(activeTab);

  return (
  <div className="mb-6 no-print">
    <div className="app-navigation-row flex min-w-0 flex-col gap-2 py-1 lg:flex-row lg:items-center lg:gap-3">
      <div role="tablist" aria-label="Hauptbereiche" className="app-navigation-tabs flex w-full min-w-0 gap-2 lg:w-auto">
        {getVisibleTabs(easyMode).map((tab) => (
          <button
            key={tab.id}
            id={getTabButtonId(tab.id)}
            ref={(element) => {
              tabButtonRefs.current[tab.id] = element;
            }}
            role="tab"
            aria-selected={navigationTab === tab.id}
            aria-controls={getTabPanelId(tab.id)}
            tabIndex={navigationTab === tab.id ? 0 : -1}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            onKeyDown={(event) => onTabKeyDown(event, tab.id)}
            className={`${navigationTab === tab.id ? "button-primary" : "button-secondary"} app-navigation-tab shrink-0 gap-2 whitespace-nowrap`}
          >
            <TabIcon id={tab.id} />
            {tab.label}
          </button>
        ))}
      </div>
      {!easyMode ? (
        <GlobalSearch
          key={sensitiveSearchSessionVersion}
          searchResults={searchResults}
          onSearchResultSelect={onSearchResultSelect}
        />
      ) : null}
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
};
