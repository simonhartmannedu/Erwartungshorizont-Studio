import { useEffect, useMemo, useState } from "react";
import { DraftWorkspace, Exam, StudentDatabase } from "../types";
import { getStudentAssessment, getStudentCorrectionStatus } from "../utils/students";
import { KeyIcon, LockIcon, UnlockIcon } from "./icons";
import { Card, Field } from "./ui";

interface Props {
  database: StudentDatabase;
  workspaces: DraftWorkspace[];
  activeExam: Exam;
  activeWorkspaceId: string;
  activeGroupId: string;
  activeStudentId: string;
  onSelectGroup: (groupId: string) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectStudent: (studentId: string) => void;
  onToggleStudentAbsent: (groupId: string, studentId: string, isAbsent: boolean) => void;
  onRevealGroupStudentNames: (groupId: string) => Promise<Record<string, string>>;
  isSelectedGroupUnlocked: boolean;
  activeGroupIsProtected: boolean;
  securityActionLabel: string;
  onToggleSecurity: () => void;
}

export const StudentSelectionPanel = ({
  database,
  workspaces,
  activeExam,
  activeWorkspaceId,
  activeGroupId,
  activeStudentId,
  onSelectGroup,
  onSelectWorkspace,
  onSelectStudent,
  onToggleStudentAbsent,
  onRevealGroupStudentNames,
  isSelectedGroupUnlocked,
  activeGroupIsProtected,
  securityActionLabel,
  onToggleSecurity,
}: Props) => {
  const getWorkspaceDisplayLabel = (workspace: DraftWorkspace) =>
    workspace.exam.meta.title.trim() || workspace.label;
  const getCorrectionStatusLabel = (status: "uncorrected" | "inProgress" | "corrected") => {
    switch (status) {
      case "corrected":
        return "korrigiert";
      case "inProgress":
        return "in Korrektur";
      default:
        return "offen";
    }
  };
  const [resolvedNamesByStudentId, setResolvedNamesByStudentId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!activeGroupId || !isSelectedGroupUnlocked) {
      setResolvedNamesByStudentId({});
      return;
    }

    let cancelled = false;
    void (async () => {
      const names = await onRevealGroupStudentNames(activeGroupId);
      if (!cancelled) {
        setResolvedNamesByStudentId(names);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeGroupId, isSelectedGroupUnlocked, onRevealGroupStudentNames]);

  const activeGroup =
    database.groups.find((group) => group.id === activeGroupId) ?? null;
  const selectedStudentRecord =
    activeGroup?.students.find((student) => student.id === activeStudentId) ?? null;
  const studentCorrectionStatuses = useMemo(
    () =>
      new Map(
        (activeGroup?.students ?? []).map((student) => [
          student.id,
          getStudentCorrectionStatus(activeExam, getStudentAssessment(database, student.id, activeWorkspaceId)),
        ]),
      ),
    [activeExam, activeGroup?.students, activeWorkspaceId, database],
  );
  const selectedStudentCorrectionStatus = selectedStudentRecord
    ? studentCorrectionStatuses.get(selectedStudentRecord.id) ?? "uncorrected"
    : "uncorrected";
  const getStudentDisplayLabel = (studentId: string, alias: string) => {
    const fullName = resolvedNamesByStudentId[studentId]?.trim();
    return fullName ? `${fullName} · ${alias}` : alias;
  };

  return (
    <div className="space-y-6 no-print xl:sticky xl:top-6">
      <Card
        title="Auswahl"
        subtitle="Im Arbeitsbereich erscheinen Schülercodes. Klarnamen werden nur lokal entschlüsselt."
      >
        {activeGroup ? (
          <div className="surface-muted mb-4 rounded-3xl p-4">
            <button
              type="button"
              className={`security-key-trigger ${isSelectedGroupUnlocked ? "is-unlocked" : "is-locked"}`}
              onClick={onToggleSecurity}
              disabled={!activeGroupIsProtected}
              aria-label={securityActionLabel}
            >
              <span className="security-key-trigger-orb" aria-hidden="true">
                <span className="security-key-trigger-ring security-key-trigger-ring-outer" />
                <span className="security-key-trigger-ring security-key-trigger-ring-inner" />
                <span className="security-key-trigger-key">
                  <KeyIcon className="h-10 w-10 sm:h-12 sm:w-12" />
                </span>
                <span className="security-key-trigger-lock">
                  {isSelectedGroupUnlocked ? <UnlockIcon className="h-6 w-6" /> : <LockIcon className="h-6 w-6" />}
                </span>
              </span>
              <span className="security-key-trigger-copy">
                <span className="security-key-trigger-kicker">Datenschutz</span>
                <span className="security-key-trigger-title">{securityActionLabel}</span>
                <span className="security-key-trigger-meta">
                  {activeGroup.subject} · {activeGroup.className}
                  {activeGroupIsProtected ? "" : " · ungeschützt"}
                </span>
              </span>
            </button>
          </div>
        ) : null}
        {selectedStudentRecord && activeGroup ? (
          <div className="space-y-4">
            <Field label="Klassenarbeit">
              <select
                className="field"
                value={activeWorkspaceId}
                onChange={(event) => onSelectWorkspace(event.target.value)}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {getWorkspaceDisplayLabel(workspace)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Klasse">
              <select
                className="field"
                value={activeGroupId}
                onChange={(event) => {
                  onSelectGroup(event.target.value);
                  const nextGroup = database.groups.find((group) => group.id === event.target.value);
                  onSelectStudent(nextGroup?.students[0]?.id ?? "");
                }}
              >
                <option value="">Lerngruppe wählen</option>
                {database.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.subject} · {group.className}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Schülercode">
              <select
                className="field"
                value={activeStudentId}
                onChange={(event) => onSelectStudent(event.target.value)}
                disabled={!activeGroup || activeGroup.students.length === 0}
              >
                <option value="">Schüler wählen</option>
                {activeGroup.students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {getStudentDisplayLabel(student.id, student.alias)}
                    {student.isAbsent ? " · abwesend" : ` · ${getCorrectionStatusLabel(studentCorrectionStatuses.get(student.id) ?? "uncorrected")}`}
                  </option>
                ))}
              </select>
            </Field>
            <div className="surface-muted rounded-3xl p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="label">Auswahl</p>
                  <p className="themed-strong text-lg font-semibold">
                    {getStudentDisplayLabel(selectedStudentRecord.id, selectedStudentRecord.alias)}
                  </p>
                  <p className="themed-muted mt-1 text-sm">
                    {activeGroup.subject} · {activeGroup.className}
                  </p>
                  <p className="mt-2 text-sm font-medium" style={{ color: "var(--app-text-strong)" }}>
                    Status: {selectedStudentRecord.isAbsent ? "abwesend" : getCorrectionStatusLabel(selectedStudentCorrectionStatus)}
                  </p>
                  <label
                    className="mt-3 flex items-center gap-2 text-sm"
                    style={{ color: "var(--app-text-strong)" }}
                    title="Abwesende Schüler werden in Statistiken und Korrekturquoten nicht berücksichtigt."
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selectedStudentRecord.isAbsent)}
                      onChange={(event) => onToggleStudentAbsent(activeGroup.id, selectedStudentRecord.id, event.target.checked)}
                    />
                    Abwesend
                  </label>
                </div>
              </div>
              {activeGroup.passwordVerifier && !isSelectedGroupUnlocked ? (
                <p className="warning-note mt-3 text-xs leading-5">
                  Bewertungsdaten und Klarnamen bleiben gesperrt, bis du die aktive Klasse oben über das Schlüsselmodul entsperrst.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Klassenarbeit">
              <select
                className="field"
                value={activeWorkspaceId}
                onChange={(event) => onSelectWorkspace(event.target.value)}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {getWorkspaceDisplayLabel(workspace)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Klasse">
              <select
                className="field"
                value={activeGroupId}
                onChange={(event) => {
                  onSelectGroup(event.target.value);
                  const nextGroup = database.groups.find((group) => group.id === event.target.value);
                  onSelectStudent(nextGroup?.students[0]?.id ?? "");
                }}
              >
                <option value="">Lerngruppe wählen</option>
                {database.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.subject} · {group.className}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Schülercode">
              <select
                className="field"
                value={activeStudentId}
                onChange={(event) => onSelectStudent(event.target.value)}
                disabled={!activeGroup || activeGroup.students.length === 0}
              >
                <option value="">Schüler wählen</option>
                {activeGroup?.students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {getStudentDisplayLabel(student.id, student.alias)} · {getCorrectionStatusLabel(studentCorrectionStatuses.get(student.id) ?? "uncorrected")}
                  </option>
                ))}
              </select>
            </Field>
            <p className="status-note text-sm leading-6">
              Wähle eine Lerngruppe und einen Schülercode. Ohne Auswahl arbeitet die App mit dem allgemeinen Bewertungsraster.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
