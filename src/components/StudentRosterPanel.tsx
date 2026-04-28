import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { DraftWorkspace, GroupAccessMode, StudentDatabase, StudentGroup, StudentRecord } from "../types";
import { ImportSortOptions } from "../utils/studentImport";
import { ChevronDownIcon, ChevronRightIcon, DownloadIcon, EyeIcon, PlusIcon, TrashIcon, UploadIcon, UserIcon } from "./icons";
import { Badge, Card, DismissibleCallout, Field, IconButton } from "./ui";
import { ConfirmDialog } from "./ConfirmDialog";
import { StudentPerformanceView } from "./StudentPerformanceView";

type GroupSortField = "alias" | "lastName" | "firstName" | "fullName";
type SortDirection = "ascending" | "descending";

interface Props {
  database: StudentDatabase;
  workspaces: DraftWorkspace[];
  defaultImportSubject: string;
  activeGroupId: string;
  activeStudentId: string;
  activeGroupHasPassword: boolean;
  isActiveGroupUnlocked: boolean;
  unlockedGroupIds: string[];
  backupStatus: {
    tone: "info" | "warning" | "success" | "danger";
    summary: string;
    detail: string;
  };
  lastBackupAt: string | null;
  onSelectGroup: (groupId: string) => void;
  onSelectStudent: (studentId: string) => void;
  onAddGroup: (subject: string, className: string, access: { mode: GroupAccessMode; password?: string }) => Promise<void>;
  onAddStudent: (groupId: string, alias: string, fullName: string) => Promise<boolean>;
  onRemoveStudent: (groupId: string, studentId: string) => void;
  onImportStudents: (
    file: File,
    access: { mode: GroupAccessMode; password?: string },
    subject: string,
    sortOptions: ImportSortOptions,
  ) => void;
  onRemoveGroup: (groupId: string, groupLabel: string, studentCount: number) => void;
  onRevealGroupStudentNames: (groupId: string) => Promise<Record<string, string>>;
  onApplyStudentOrder: (groupId: string, orderedStudentIds: string[]) => void;
  onExportDatabase: (passphrase: string) => Promise<boolean>;
  onImportDatabase: (file: File, passphrase: string) => void;
  canRollbackImport: boolean;
  onRollbackImport: () => void;
}

const collator = new Intl.Collator("de-DE", { sensitivity: "base", numeric: true });

const parseNameParts = (fullName: string | null) => {
  const normalized = fullName?.trim() ?? "";
  if (!normalized) {
    return { fullName: "", firstName: "", lastName: "" };
  }

  if (normalized.includes(",")) {
    const [lastNamePart, ...firstNameParts] = normalized.split(",");
    return {
      fullName: normalized,
      firstName: firstNameParts.join(",").trim(),
      lastName: lastNamePart.trim(),
    };
  }

  const segments = normalized.split(/\s+/).filter(Boolean);
  if (segments.length <= 1) {
    return { fullName: normalized, firstName: normalized, lastName: normalized };
  }

  return {
    fullName: normalized,
    firstName: segments.slice(0, -1).join(" "),
    lastName: segments[segments.length - 1] ?? "",
  };
};

const getStudentSortValue = (
  student: StudentRecord,
  namesByStudentId: Record<string, string> | undefined,
  field: GroupSortField,
) => {
  if (field === "alias") {
    return student.alias.trim();
  }

  const parsedName = parseNameParts(namesByStudentId?.[student.id] ?? null);
  if (field === "lastName") return parsedName.lastName;
  if (field === "firstName") return parsedName.firstName;
  return parsedName.fullName;
};

const getStudentDisplayLabel = (student: StudentRecord, namesByStudentId: Record<string, string> | undefined) => {
  const fullName = namesByStudentId?.[student.id]?.trim();
  return fullName ? `${fullName} · ${student.alias}` : student.alias;
};

export const StudentRosterPanel = ({
  database,
  workspaces,
  defaultImportSubject,
  activeGroupId,
  activeStudentId,
  activeGroupHasPassword,
  isActiveGroupUnlocked,
  unlockedGroupIds,
  backupStatus,
  lastBackupAt,
  onSelectGroup,
  onSelectStudent,
  onAddGroup,
  onAddStudent,
  onRemoveStudent,
  onImportStudents,
  onRemoveGroup,
  onRevealGroupStudentNames,
  onApplyStudentOrder,
  onExportDatabase,
  onImportDatabase,
  canRollbackImport,
  onRollbackImport,
}: Props) => {
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [groupAccessMode, setGroupAccessMode] = useState<GroupAccessMode>("generated");
  const [groupPassword, setGroupPassword] = useState("");
  const [importAccessMode, setImportAccessMode] = useState<GroupAccessMode>("generated");
  const [importPassword, setImportPassword] = useState("");
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [importSubject, setImportSubject] = useState(defaultImportSubject);
  const [importSortField, setImportSortField] = useState<ImportSortOptions["field"]>("lastName");
  const [importSortDirection, setImportSortDirection] = useState<ImportSortOptions["direction"]>("ascending");
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [studentDraftsByGroupId, setStudentDraftsByGroupId] = useState<Record<string, { alias: string; fullName: string }>>({});
  const [pendingStudentDelete, setPendingStudentDelete] = useState<{ groupId: string; studentId: string; label: string } | null>(null);
  const [viewedStudent, setViewedStudent] = useState<{ groupId: string; studentId: string } | null>(null);
  const [resolvedNamesByGroupId, setResolvedNamesByGroupId] = useState<Record<string, Record<string, string>>>({});
  const [sortStateByGroupId, setSortStateByGroupId] = useState<
    Record<string, { field: GroupSortField; direction: SortDirection }>
  >({});

  useEffect(() => {
    setImportSubject((current) => current || defaultImportSubject);
  }, [defaultImportSubject]);

  useEffect(() => {
    setCollapsedGroupIds((current) => {
      const validCollapsedIds = current.filter((groupId) => database.groups.some((group) => group.id === groupId));
      const nextCollapsedIds = database.groups
        .filter((group) => group.id !== activeGroupId)
        .map((group) => group.id)
        .filter((groupId) => validCollapsedIds.includes(groupId));

      if (current.length === 0 && database.groups.length > 1) {
        return database.groups.filter((group) => group.id !== activeGroupId).map((group) => group.id);
      }

      return nextCollapsedIds;
    });
  }, [database.groups, activeGroupId]);

  useEffect(() => {
    if (!viewedStudent) return;

    const group = database.groups.find((entry) => entry.id === viewedStudent.groupId);
    if (!group?.students.some((student) => student.id === viewedStudent.studentId)) {
      setViewedStudent(null);
    }
  }, [database.groups, viewedStudent]);

  useEffect(() => {
    const unlockedGroupIdSet = new Set(unlockedGroupIds);
    setResolvedNamesByGroupId((current) =>
      Object.fromEntries(Object.entries(current).filter(([groupId]) => unlockedGroupIdSet.has(groupId))),
    );

    let cancelled = false;
    void (async () => {
      for (const group of database.groups) {
        if (!group.passwordVerifier || !unlockedGroupIdSet.has(group.id)) continue;

        const names = await onRevealGroupStudentNames(group.id);
        if (cancelled) return;

        setResolvedNamesByGroupId((current) => ({
          ...current,
          [group.id]: names,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [database.groups, onRevealGroupStudentNames, unlockedGroupIds]);

  const activeGroup = useMemo(
    () => database.groups.find((group) => group.id === activeGroupId) ?? database.groups[0] ?? null,
    [database.groups, activeGroupId],
  );

  const selectedStudentRecord =
    activeGroup?.students.find((student) => student.id === activeStudentId) ?? activeGroup?.students[0] ?? null;

  const totalStudents = database.groups.reduce((sum, group) => sum + group.students.length, 0);
  const activeGroupLabel = activeGroup ? `${activeGroup.subject} · ${activeGroup.className}` : "Keine Lerngruppe aktiv";

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onImportDatabase(file, backupPassphrase);
    event.target.value = "";
  };

  const handleStudentImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onImportStudents(file, {
      mode: importAccessMode,
      password: importAccessMode === "manual" ? importPassword.trim() : undefined,
    }, importSubject.trim() || defaultImportSubject, {
      field: importSortField,
      direction: importSortDirection,
    });
    event.target.value = "";
  };

  const toggleGroupSection = (groupId: string) => {
    setCollapsedGroupIds((current) =>
      current.includes(groupId) ? current.filter((entry) => entry !== groupId) : [...current, groupId],
    );
  };

  const selectStudent = (groupId: string, studentId: string) => {
    onSelectGroup(groupId);
    onSelectStudent(studentId);
  };

  const openStudentPerformanceView = (groupId: string, studentId: string) => {
    selectStudent(groupId, studentId);
    setCollapsedGroupIds((current) => current.filter((entry) => entry !== groupId));
    setViewedStudent((current) =>
      current?.groupId === groupId && current.studentId === studentId
        ? null
        : { groupId, studentId },
    );
  };

  const updateStudentDraft = (groupId: string, patch: Partial<{ alias: string; fullName: string }>) => {
    setStudentDraftsByGroupId((current) => ({
      ...current,
      [groupId]: {
        alias: patch.alias ?? current[groupId]?.alias ?? "",
        fullName: patch.fullName ?? current[groupId]?.fullName ?? "",
      },
    }));
  };

  const resetStudentDraft = (groupId: string) => {
    setStudentDraftsByGroupId((current) => ({
      ...current,
      [groupId]: { alias: "", fullName: "" },
    }));
  };

  const moveStudent = (group: StudentGroup, studentId: string, direction: "up" | "down") => {
    const currentIndex = group.students.findIndex((student) => student.id === studentId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= group.students.length) return;

    const orderedStudentIds = group.students.map((student) => student.id);
    const [movedStudentId] = orderedStudentIds.splice(currentIndex, 1);
    orderedStudentIds.splice(targetIndex, 0, movedStudentId!);
    onApplyStudentOrder(group.id, orderedStudentIds);
  };

  const applySort = (group: StudentGroup, field: GroupSortField) => {
    if (field !== "alias" && !resolvedNamesByGroupId[group.id]) return;

    const currentState = sortStateByGroupId[group.id];
    const direction: SortDirection =
      currentState?.field === field && currentState.direction === "ascending" ? "descending" : "ascending";
    const directionFactor = direction === "ascending" ? 1 : -1;
    const namesByStudentId = resolvedNamesByGroupId[group.id];

    const orderedStudentIds = [...group.students]
      .sort((left, right) => {
        const primaryComparison = collator.compare(
          getStudentSortValue(left, namesByStudentId, field),
          getStudentSortValue(right, namesByStudentId, field),
        );
        if (primaryComparison !== 0) return primaryComparison * directionFactor;

        return collator.compare(left.alias, right.alias) * directionFactor;
      })
      .map((student) => student.id);

    onApplyStudentOrder(group.id, orderedStudentIds);
    setSortStateByGroupId((current) => ({
      ...current,
      [group.id]: { field, direction },
    }));
  };

  const renderSortButton = (group: StudentGroup, field: GroupSortField, label: string, disabled = false) => {
    const currentState = sortStateByGroupId[group.id];
    const isActive = currentState?.field === field;
    const indicator = isActive ? (currentState.direction === "ascending" ? " ↑" : " ↓") : "";

    return (
      <button
        type="button"
        className="text-left font-semibold transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-45"
        onClick={() => applySort(group, field)}
        disabled={disabled}
      >
        {label}
        {indicator}
      </button>
    );
  };

  return (
    <div className="space-y-6 no-print">
      <Card
        title="Lerngruppen"
        subtitle="Fach, Klasse und Schülercodes lokal verwalten. Klarnamen bleiben verschlüsselt."
      >
        <div className="surface-muted grid gap-3 rounded-3xl p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
            <div className="surface-elevated rounded-2xl border p-4 md:row-span-2">
              <p className="label">Aktive Lerngruppe</p>
              <p className="themed-strong text-lg font-semibold">{activeGroupLabel}</p>
              <p className="themed-muted mt-2 text-sm">
                {selectedStudentRecord ? `Schülercode ${selectedStudentRecord.alias} ausgewählt` : "Noch kein Schülercode ausgewählt"}
              </p>
            </div>
            <div className="surface-elevated rounded-2xl border p-3">
              <p className="label">Gruppen</p>
              <p className="themed-strong text-xl font-semibold">{database.groups.length}</p>
            </div>
            <div className="surface-elevated rounded-2xl border p-3">
              <p className="label">Schüler</p>
              <p className="themed-strong text-xl font-semibold">{totalStudents}</p>
            </div>
            <div className="surface-elevated col-span-2 rounded-2xl border p-3 md:col-span-1">
              <p className="label">Letzte Sicherung</p>
              <p className="themed-strong text-sm font-semibold">
                {lastBackupAt ? new Date(lastBackupAt).toLocaleDateString("de-DE") : "Noch keine"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap content-start gap-2 lg:justify-end">
            <Badge tone={activeGroupHasPassword ? "emerald" : "amber"}>
              {activeGroupHasPassword ? "Aktive Klasse geschützt" : "Aktive Klasse ohne Passwort"}
            </Badge>
            {activeGroup && activeGroup.passwordVerifier && (
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isActiveGroupUnlocked ? "badge-emerald" : "badge-rose"}`}
              >
                <span
                  className={isActiveGroupUnlocked ? "badge-emerald h-2.5 w-2.5 rounded-full" : "badge-rose h-2.5 w-2.5 rounded-full"}
                  style={{ backgroundColor: "currentColor" }}
                />
                {isActiveGroupUnlocked ? "Klasse entsperrt" : "Klasse gesperrt"}
              </span>
            )}
            {activeGroup && <Badge tone="slate">{activeGroup.students.length} Schülercodes aktiv</Badge>}
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card
          title="Lerngruppen anlegen & importieren"
          subtitle="Neue Klassen anlegen oder Listen importieren."
        >
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="surface-muted space-y-4 rounded-3xl p-4">
              <p className="themed-muted text-xs font-semibold uppercase tracking-[0.18em]">Neue Lerngruppe</p>
              <Field label="Fach">
                <input className="field" placeholder="Fach, z. B. Englisch" value={subject} onChange={(event) => setSubject(event.target.value)} />
              </Field>
              <Field label="Klasse">
                <input className="field" placeholder="Klasse, z. B. 8b" value={className} onChange={(event) => setClassName(event.target.value)} />
              </Field>
              <Field as="div" label="Zugangsschutz">
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className={groupAccessMode === "generated" ? "button-primary w-full" : "button-secondary w-full"}
                    onClick={() => setGroupAccessMode("generated")}
                  >
                    Token generieren
                  </button>
                  <button
                    type="button"
                    className={groupAccessMode === "manual" ? "button-primary w-full" : "button-secondary w-full"}
                    onClick={() => setGroupAccessMode("manual")}
                  >
                    Eigenes Passwort
                  </button>
                </div>
              </Field>
              {groupAccessMode === "manual" ? (
                <Field label="Klassenpasswort">
                  <input
                    className="field"
                    type="password"
                    placeholder="Klassenpasswort für Verschlüsselung"
                    value={groupPassword}
                    onChange={(event) => setGroupPassword(event.target.value)}
                  />
                </Field>
              ) : (
                <p className="status-note text-xs leading-5">
                  Beim Anlegen wird automatisch ein starkes Security-Token erzeugt und direkt als Druckkarte angeboten.
                </p>
              )}
              <button
                type="button"
                className="button-primary w-full gap-2"
                onClick={async () => {
                  if (!subject.trim() || !className.trim()) return;
                  if (groupAccessMode === "manual" && !groupPassword.trim()) return;
                  await onAddGroup(subject.trim(), className.trim(), {
                    mode: groupAccessMode,
                    password: groupAccessMode === "manual" ? groupPassword.trim() : undefined,
                  });
                  setSubject("");
                  setClassName("");
                  setGroupPassword("");
                  setGroupAccessMode("generated");
                }}
              >
                <PlusIcon />
                Lerngruppe anlegen
              </button>
            </div>

            <div className="surface-elevated rounded-3xl border p-4">
              <p className="themed-muted text-xs font-semibold uppercase tracking-[0.18em]">
                Klassenimport
              </p>
              <div className="mt-4 grid gap-3">
                <input
                  className="field"
                  value={importSubject}
                  placeholder="Fach fuer neu importierte Klassen"
                  onChange={(event) => setImportSubject(event.target.value)}
                />
                <Field as="div" label="Zugangsschutz für neue Klassen">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className={importAccessMode === "generated" ? "button-primary w-full" : "button-secondary w-full"}
                      onClick={() => setImportAccessMode("generated")}
                    >
                      Token generieren
                    </button>
                    <button
                      type="button"
                      className={importAccessMode === "manual" ? "button-primary w-full" : "button-secondary w-full"}
                      onClick={() => setImportAccessMode("manual")}
                    >
                      Eigenes Passwort
                    </button>
                  </div>
                </Field>
                {importAccessMode === "manual" ? (
                  <input
                    className="field"
                    type="password"
                    value={importPassword}
                    placeholder="Passwort fuer neu importierte Klassen"
                    onChange={(event) => setImportPassword(event.target.value)}
                  />
                ) : (
                  <p className="status-note text-xs leading-5">
                    Für jede neu angelegte Import-Klasse wird automatisch ein eigenes Security-Token erzeugt und gesammelt druckbar gemacht.
                  </p>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    className="field"
                    value={importSortField}
                    onChange={(event) => setImportSortField(event.target.value as ImportSortOptions["field"])}
                  >
                    <option value="lastName">Nachname sortieren</option>
                    <option value="firstName">Vorname sortieren</option>
                  </select>
                  <select
                    className="field"
                    value={importSortDirection}
                    onChange={(event) => setImportSortDirection(event.target.value as ImportSortOptions["direction"])}
                  >
                    <option value="ascending">Aufsteigend</option>
                    <option value="descending">Absteigend</option>
                  </select>
                </div>
                <label className="button-primary w-full cursor-pointer gap-2 sm:w-auto">
                  <UploadIcon />
                  Klassenliste importieren
                  <input
                    type="file"
                    accept=".csv,.txt,.xls,.xlsx,.ods,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
                    className="hidden"
                    onChange={handleStudentImport}
                  />
                </label>
              </div>
              <p className="status-note mt-3 text-xs leading-5">
                Erwartete Spalten: <strong>Nachname</strong>, <strong>Name/Vorname</strong>, <strong>Klasse</strong>.
              </p>
            </div>
          </div>
        </Card>

        <Card
          title="Klassenlisten"
          subtitle="Eine Tabelle pro Klasse."
        >
          <div className="space-y-4">
            {database.groups.length === 0 ? (
              <p className="status-note text-sm leading-6">
                Noch keine Lerngruppen vorhanden. Lege zuerst eine Klasse an oder importiere eine Klassenliste.
              </p>
            ) : (
              database.groups.map((group) => {
                const isCollapsed = collapsedGroupIds.includes(group.id);
                const isUnlocked = unlockedGroupIds.includes(group.id);
                const namesByStudentId = resolvedNamesByGroupId[group.id];

                return (
                  <section key={group.id} className="surface-elevated overflow-hidden rounded-[32px] border">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="button-secondary gap-2 px-3 py-2 text-xs"
                            onClick={() => toggleGroupSection(group.id)}
                          >
                            {isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                            {group.subject} · {group.className}
                          </button>
                          <Badge tone={group.id === activeGroupId ? "emerald" : "slate"}>
                            {group.id === activeGroupId ? "Aktiv" : "Klasse"}
                          </Badge>
                          <Badge tone={isUnlocked ? "emerald" : "amber"}>
                            {isUnlocked ? "Klarnamen sichtbar" : "Nur Schülercodes sichtbar"}
                          </Badge>
                        </div>
                        <p className="subsection-copy mt-3 text-sm">
                          {group.students.length === 0
                            ? "Für diese Klasse sind noch keine Schüler angelegt."
                            : `${group.students.length} Schüler in dieser Liste.`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-start justify-end gap-2">
                        {group.id === activeGroupId ? <Badge tone="emerald">Ausgewählt</Badge> : null}
                        <button
                          type="button"
                          className="button-secondary gap-2 px-3 py-2 text-xs"
                          onClick={() => {
                            onSelectGroup(group.id);
                            onSelectStudent(group.students[0]?.id ?? "");
                          }}
                        >
                          Aktivieren
                        </button>
                        <IconButton
                          onClick={() => onRemoveGroup(group.id, `${group.subject} · ${group.className}`, group.students.length)}
                          title="Lerngruppe entfernen"
                          variant="soft"
                          className="px-3 py-2 text-xs"
                        >
                          <TrashIcon />
                          Entfernen
                        </IconButton>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="border-t px-5 py-5" style={{ borderColor: "var(--app-border)" }}>
                        <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(260px,0.95fr)]">
                          <div className="surface-muted rounded-3xl p-4">
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
                              <input
                                className="field"
                                placeholder="Schülercode, z. B. E8B-01"
                                value={studentDraftsByGroupId[group.id]?.alias ?? ""}
                                onChange={(event) => updateStudentDraft(group.id, { alias: event.target.value })}
                              />
                              <input
                                className="field"
                                placeholder="Klarname"
                                value={studentDraftsByGroupId[group.id]?.fullName ?? ""}
                                onChange={(event) => updateStudentDraft(group.id, { fullName: event.target.value })}
                              />
                              <button
                                type="button"
                                className="button-primary gap-2 md:self-start"
                                disabled={!group.passwordVerifier || !isUnlocked}
                                onClick={async () => {
                                  const aliasDraft = studentDraftsByGroupId[group.id]?.alias ?? "";
                                  const fullNameDraft = studentDraftsByGroupId[group.id]?.fullName ?? "";
                                  if (!aliasDraft.trim() || !fullNameDraft.trim()) return;
                                  const success = await onAddStudent(group.id, aliasDraft.trim(), fullNameDraft.trim());
                                  if (!success) return;
                                  resetStudentDraft(group.id);
                                  onSelectGroup(group.id);
                                }}
                              >
                                <UserIcon />
                                Schüler hinzufügen
                              </button>
                            </div>
                            {!group.passwordVerifier ? (
                              <p className="warning-note mt-3 text-xs">Alte Klasse ohne Passwortschutz: keine verschlüsselten Namen möglich.</p>
                            ) : !isUnlocked ? (
                              <p className="warning-note mt-3 text-xs">Zum Hinzufügen bitte diese Klasse zuerst entsperren.</p>
                            ) : null}
                          </div>
                          <div className="surface-elevated rounded-3xl border p-4">
                            <p className="label">Listenmodus</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div className="surface-muted rounded-2xl p-3">
                                <p className="label">Sortieren</p>
                                <p className="themed-muted mt-1 text-sm">Nach Code, Klarname, Nachname oder Vorname.</p>
                              </div>
                              <div className="surface-muted rounded-2xl p-3">
                                <p className="label">Reihenfolge</p>
                                <p className="themed-muted mt-1 text-sm">Oben, unten oder direkt löschen.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        {group.students.length === 0 ? (
                          <p className="status-note text-sm leading-6">Keine Schülercodes in dieser Klasse.</p>
                        ) : (
                          <div className="themed-table-shell overflow-hidden rounded-3xl border">
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="themed-table-head">
                                  <tr className="text-left text-xs uppercase tracking-[0.16em]">
                                    <th className="px-4 py-3">{renderSortButton(group, "alias", "Schülercode")}</th>
                                    <th className="px-4 py-3">{renderSortButton(group, "fullName", "Klarname", !isUnlocked)}</th>
                                    <th className="px-4 py-3">{renderSortButton(group, "lastName", "Nachname", !isUnlocked)}</th>
                                    <th className="px-4 py-3">{renderSortButton(group, "firstName", "Vorname", !isUnlocked)}</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Aktionen</th>
                                  </tr>
                                </thead>
                                <tbody className="themed-table-body">
                                  {group.students.map((student, index) => {
                                    const parsedName = parseNameParts(namesByStudentId?.[student.id] ?? null);
                                    const isSelected = group.id === activeGroupId && student.id === activeStudentId;

                                    return (
                                      <tr
                                        key={student.id}
                                        className={`themed-table-row ${isSelected ? "bg-black/5 dark:bg-white/5" : ""}`}
                                      >
                                        <td className="px-4 py-3 align-top">
                                          <button
                                            type="button"
                                            className="themed-strong text-left font-semibold underline-offset-4 hover:underline"
                                            onClick={() => selectStudent(group.id, student.id)}
                                          >
                                            {student.alias}
                                          </button>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                          {isUnlocked ? (
                                            <span className="themed-strong font-medium">{parsedName.fullName || "—"}</span>
                                          ) : (
                                            <span className="themed-muted">Entsperren zum Anzeigen</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 align-top">{isUnlocked ? parsedName.lastName || "—" : "—"}</td>
                                        <td className="px-4 py-3 align-top">{isUnlocked ? parsedName.firstName || "—" : "—"}</td>
                                        <td className="px-4 py-3 align-top">
                                          {student.isAbsent ? (
                                            <span className="badge-amber inline-flex rounded-full px-3 py-1 text-xs font-semibold">abwesend</span>
                                          ) : isSelected ? (
                                            <span className="badge-emerald inline-flex rounded-full px-3 py-1 text-xs font-semibold">ausgewählt</span>
                                          ) : (
                                            <span className="badge-slate inline-flex rounded-full px-3 py-1 text-xs font-semibold">aktiv</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                          <div className="flex justify-end gap-2">
                                            <button
                                              type="button"
                                              className={`px-3 py-2 text-xs ${
                                                viewedStudent?.groupId === group.id && viewedStudent.studentId === student.id
                                                  ? "button-primary"
                                                  : "button-secondary"
                                              }`}
                                              title="SuS-View öffnen"
                                              aria-label={`SuS-View für ${student.alias} öffnen`}
                                              aria-expanded={viewedStudent?.groupId === group.id && viewedStudent.studentId === student.id}
                                              onClick={() => openStudentPerformanceView(group.id, student.id)}
                                            >
                                              <EyeIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                              type="button"
                                              className="button-secondary px-3 py-2 text-xs"
                                              onClick={() => moveStudent(group, student.id, "up")}
                                              disabled={index === 0}
                                            >
                                              ↑
                                            </button>
                                            <button
                                              type="button"
                                              className="button-secondary px-3 py-2 text-xs"
                                              onClick={() => moveStudent(group, student.id, "down")}
                                              disabled={index === group.students.length - 1}
                                            >
                                              ↓
                                            </button>
                                            <button
                                              type="button"
                                              className="button-soft px-3 py-2 text-xs"
                                              onClick={() =>
                                                setPendingStudentDelete({
                                                  groupId: group.id,
                                                  studentId: student.id,
                                                  label: getStudentDisplayLabel(student, namesByStudentId),
                                                })}
                                            >
                                              <TrashIcon className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {viewedStudent?.groupId === group.id ? (() => {
                          const viewedRecord = group.students.find((student) => student.id === viewedStudent.studentId);
                          if (!viewedRecord) return null;

                          return (
                            <div className="mt-5">
                              <StudentPerformanceView
                                database={database}
                                group={group}
                                student={viewedRecord}
                                studentLabel={getStudentDisplayLabel(viewedRecord, namesByStudentId)}
                                workspaces={workspaces}
                              />
                            </div>
                          );
                        })() : null}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card
            title="Backup & Wiederherstellung"
            subtitle="Arbeitsstand exportieren oder wieder einspielen."
          >
            <div className="space-y-4">
              <DismissibleCallout tone={backupStatus.tone} resetKey={`${backupStatus.summary}-${lastBackupAt ?? "none"}`}>
                <p className="font-semibold">{backupStatus.summary}</p>
                <p>{backupStatus.detail}</p>
              </DismissibleCallout>
              <div className="surface-elevated rounded-3xl border p-4">
                <div className="grid gap-3">
                  <input
                    className="field"
                    type="password"
                    value={backupPassphrase}
                    placeholder="Backup-Passwort für Export und verschlüsselte Importe"
                    onChange={(event) => setBackupPassphrase(event.target.value)}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      className="button-primary w-full gap-2 sm:w-auto"
                      onClick={() => {
                        void onExportDatabase(backupPassphrase);
                      }}
                    >
                      <DownloadIcon />
                      Arbeitsstand-Backup exportieren
                    </button>
                    <label className="button-secondary w-full cursor-pointer gap-2 sm:w-auto">
                      <UploadIcon />
                      Arbeitsstand-Backup importieren
                      <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
                    </label>
                    {canRollbackImport ? (
                      <button type="button" className="button-secondary w-full gap-2 sm:w-auto" onClick={onRollbackImport}>
                        Letzten Import rückgängig
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              {lastBackupAt && (
                <p className="status-note text-xs leading-5">
                  Letzte erfolgreiche Sicherung: {new Date(lastBackupAt).toLocaleString("de-DE")}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={pendingStudentDelete !== null}
        title="Schüler löschen"
        description={
          pendingStudentDelete
            ? `Soll ${pendingStudentDelete.label} aus der Klassenliste entfernt werden?\n\nZugehörige Bewertungen dieser Person werden ebenfalls gelöscht.`
            : ""
        }
        onCancel={() => setPendingStudentDelete(null)}
        onConfirm={() => {
          if (!pendingStudentDelete) return;
          onRemoveStudent(pendingStudentDelete.groupId, pendingStudentDelete.studentId);
          setPendingStudentDelete(null);
        }}
        confirmLabel="Schüler löschen"
      />
    </div>
  );
};
