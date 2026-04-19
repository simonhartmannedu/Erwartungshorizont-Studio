import { useEffect, useMemo, useState } from "react";
import { DraftWorkspace, Exam, SelectedStudentContext, StudentDatabase } from "../types";
import { getStudentAssessment, getStudentCorrectionStatus } from "../utils/students";
import { EyeIcon, EyeOffIcon, TrashIcon, UnlockIcon } from "./icons";
import { ConfirmDialog } from "./ConfirmDialog";
import { Card, Field, IconButton } from "./ui";

interface Props {
  database: StudentDatabase;
  workspaces: DraftWorkspace[];
  activeExam: Exam;
  activeWorkspaceId: string;
  selectedStudent: SelectedStudentContext | null;
  activeGroupId: string;
  activeStudentId: string;
  onSelectGroup: (groupId: string) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectStudent: (studentId: string) => void;
  onRemoveStudent: (groupId: string, studentId: string) => void;
  onToggleStudentAbsent: (groupId: string, studentId: string, isAbsent: boolean) => void;
  onRevealStudentName: (groupId: string, studentId: string, passwordOverride?: string) => Promise<string | null>;
  onRevealGroupStudentNames: (groupId: string) => Promise<Record<string, string>>;
  onUnlockGroup: (groupId: string, password: string, options?: { silent?: boolean }) => Promise<boolean>;
  isSelectedGroupUnlocked: boolean;
}

export const StudentSelectionPanel = ({
  database,
  workspaces,
  activeExam,
  activeWorkspaceId,
  selectedStudent,
  activeGroupId,
  activeStudentId,
  onSelectGroup,
  onSelectWorkspace,
  onSelectStudent,
  onRemoveStudent,
  onToggleStudentAbsent,
  onRevealStudentName,
  onRevealGroupStudentNames,
  onUnlockGroup,
  isSelectedGroupUnlocked,
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
  const [revealedName, setRevealedName] = useState<string | null>(null);
  const [isRevealingName, setIsRevealingName] = useState(false);
  const [resolvedNamesByStudentId, setResolvedNamesByStudentId] = useState<Record<string, string>>({});
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState("");
  const [unlockDialogError, setUnlockDialogError] = useState("");

  useEffect(() => {
    setRevealedName(null);
  }, [selectedStudent?.groupId, selectedStudent?.studentId]);

  useEffect(() => {
    if (!isSelectedGroupUnlocked) {
      setRevealedName(null);
    }
  }, [isSelectedGroupUnlocked]);

  useEffect(() => {
    setUnlockDialogOpen(false);
    setUnlockPasswordInput("");
    setUnlockDialogError("");
  }, [activeGroupId]);

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

  const revealSelectedStudentName = async (passwordOverride?: string) => {
    if (!activeGroup || !selectedStudentRecord) return;

    setIsRevealingName(true);
    try {
      const fullName = await onRevealStudentName(activeGroup.id, selectedStudentRecord.id, passwordOverride);
      if (fullName) {
        setRevealedName(fullName);
      }
    } finally {
      setIsRevealingName(false);
    }
  };

  const handleRevealName = async () => {
    if (!activeGroup || !selectedStudentRecord) return;

    if (revealedName) {
      setRevealedName(null);
      return;
    }

    if (!isSelectedGroupUnlocked && activeGroup.passwordVerifier) {
      setUnlockDialogError("");
      setUnlockDialogOpen(true);
      return;
    }

    await revealSelectedStudentName();
  };

  return (
    <div className="space-y-6 no-print xl:sticky xl:top-6">
      <Card
        title="Ausgewählte Schüler*in"
        subtitle="Im Arbeitsbereich erscheinen Schülercodes. Klarnamen werden nur lokal entschlüsselt."
      >
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
                  {revealedName && (
                    <p className="mt-3 break-words text-sm font-medium" style={{ color: "var(--app-text-strong)" }}>
                      {revealedName}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      void handleRevealName();
                    }}
                    title={
                      revealedName
                        ? "Klarname ausblenden"
                        : activeGroup.passwordVerifier && !isSelectedGroupUnlocked
                          ? "Klarname anzeigen und Lerngruppe per Passwort entsperren"
                          : "Klarname anzeigen"
                    }
                    className="button-primary w-full gap-2 px-3 py-2 text-xs sm:w-auto"
                  >
                    {revealedName ? (
                      <EyeOffIcon />
                    ) : activeGroup.passwordVerifier && !isSelectedGroupUnlocked ? (
                      <UnlockIcon />
                    ) : (
                      <EyeIcon />
                    )}
                    {isRevealingName ? "Prüft..." : revealedName ? "Klarname ausblenden" : "Klarname"}
                  </button>
                  <IconButton
                    onClick={() => onRemoveStudent(activeGroup.id, selectedStudentRecord.id)}
                    title="Schüler entfernen"
                    variant="soft"
                    className="w-full px-3 py-2 text-xs sm:w-auto"
                  >
                    <TrashIcon />
                    Entfernen
                  </IconButton>
                </div>
              </div>
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

      <ConfirmDialog
        open={unlockDialogOpen}
        title="Klassenpasswort eingeben"
        description="Für Klarnamen wird das Passwort der ausgewählten Klasse lokal abgefragt. Nach erfolgreicher Prüfung bleibt die Lerngruppe für diese Sitzung entsperrt."
        onCancel={() => {
          setUnlockDialogOpen(false);
          setUnlockPasswordInput("");
          setUnlockDialogError("");
        }}
        onConfirm={async () => {
          if (!activeGroup) return;
          const password = unlockPasswordInput.trim();
          if (!password) {
            setUnlockDialogError("Bitte gib das Klassenpasswort ein.");
            return;
          }

          const unlocked = await onUnlockGroup(activeGroup.id, password, { silent: true });
          if (!unlocked) {
            setUnlockDialogError("Das Klassenpasswort ist falsch.");
            return;
          }

          setUnlockDialogOpen(false);
          setUnlockPasswordInput("");
          setUnlockDialogError("");
          await revealSelectedStudentName(password);
        }}
        confirmLabel="Entsperren"
      >
        <div className="dialog-preview rounded-2xl p-4">
          <label className="block">
            <span className="label">Passwort für {activeGroup?.subject} · {activeGroup?.className}</span>
            <input
              className="field"
              type="password"
              value={unlockPasswordInput}
              onChange={(event) => {
                setUnlockPasswordInput(event.target.value);
                if (unlockDialogError) {
                  setUnlockDialogError("");
                }
              }}
            />
          </label>
          {unlockDialogError && (
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--app-danger)" }}>
              {unlockDialogError}
            </p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
};
