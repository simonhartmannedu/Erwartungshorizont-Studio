import { useEffect, useMemo, useState } from "react";
import { Exam, StudentDatabase, StudentParticipationStatus } from "../types";
import { getStudentAssessment, getStudentCorrectionStatus, getStudentParticipationStatus } from "../utils/students";
import { ChevronDownIcon, ChevronRightIcon, LockIcon, UnlockIcon } from "./icons";
import { Card, Field } from "./ui";

interface Props {
  database: StudentDatabase;
  activeExam: Exam;
  activeWorkspaceId: string;
  activeGroupId: string;
  activeStudentId: string;
  onSelectGroup: (groupId: string) => void;
  onSelectStudent: (studentId: string) => void;
  onRevealGroupStudentNames: (groupId: string) => Promise<Record<string, string>>;
  isSelectedGroupUnlocked: boolean;
  activeGroupIsProtected: boolean;
  securityActionLabel: string;
  onToggleSecurity: () => void;
}

export const StudentSelectionPanel = ({
  database,
  activeExam,
  activeWorkspaceId,
  activeGroupId,
  activeStudentId,
  onSelectGroup,
  onSelectStudent,
  onRevealGroupStudentNames,
  isSelectedGroupUnlocked,
  activeGroupIsProtected,
  securityActionLabel,
  onToggleSecurity,
}: Props) => {
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
  const [isMobileSelectionOpen, setIsMobileSelectionOpen] = useState(false);

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
  const selectedStudentAssessment = selectedStudentRecord
    ? getStudentAssessment(database, selectedStudentRecord.id, activeWorkspaceId)
    : null;
  const selectedParticipationStatus = selectedStudentRecord
    ? getStudentParticipationStatus(database, selectedStudentRecord.id, activeWorkspaceId)
    : "present";
  const taskCount = activeExam.sections.reduce((count, section) => count + section.tasks.length, 0);
  const scoredTaskCount = activeExam.sections.reduce(
    (count, section) =>
      count + section.tasks.filter(
        (task) => selectedStudentAssessment && Object.prototype.hasOwnProperty.call(selectedStudentAssessment.taskScores, task.id),
      ).length,
    0,
  );
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
  const getStudentDisplayLabel = (studentId: string, alias: string) => {
    const fullName = resolvedNamesByStudentId[studentId]?.trim();
    return fullName ? `${fullName} · ${alias}` : alias;
  };
  const getParticipationStatusLabel = (status: StudentParticipationStatus) => ({
    present: "anwesend",
    absent: "abwesend",
    excused: "entschuldigt",
    makeup: "schreibt nach",
  })[status];

  const activeGroupLabel = activeGroup ? `${activeGroup.subject} · ${activeGroup.className}` : "Noch keine Lerngruppe gewählt";
  const renderGroupSecurityStatus = () => {
    if (!activeGroup || !activeGroupIsProtected) return null;

    const isUnlocked = isSelectedGroupUnlocked;
    return (
      <button
        type="button"
        className={`group-security-status ${isUnlocked ? "is-unlocked" : "is-locked"}`}
        onClick={onToggleSecurity}
        aria-label={securityActionLabel}
        title={securityActionLabel}
      >
        <span className="group-security-status-icon" aria-hidden="true">
          {isUnlocked ? <UnlockIcon className="h-4 w-4" /> : <LockIcon className="h-4 w-4" />}
        </span>
        <span className="group-security-status-copy">
          <strong>{isUnlocked ? "Klasse entsperrt" : "Klasse gesperrt"}</strong>
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-3 no-print md:space-y-0">
      <button
        type="button"
        className="mobile-selection-toggle md:hidden"
        onClick={() => setIsMobileSelectionOpen((current) => !current)}
        aria-expanded={isMobileSelectionOpen}
        aria-controls="mobile-selection-panel"
      >
        <span>
          <small>Arbeitskontext</small>
          <strong>{activeGroupLabel}</strong>
        </span>
        {isMobileSelectionOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </button>
      <div id="mobile-selection-panel" className={isMobileSelectionOpen ? "block" : "hidden md:block"}>
      <Card
        title="Auswahl"
        subtitle="Klasse wählen, bei Bedarf entsperren und anschließend korrigieren."
      >
        <div className="space-y-4">
            {renderGroupSecurityStatus()}
            <Field label="Klasse">
              <select
                className="field"
                value={activeGroupId}
                onChange={(event) => {
                  onSelectGroup(event.target.value);
                  onSelectStudent("");
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
                    {getStudentDisplayLabel(student.id, student.alias)}
                    {` · ${getParticipationStatusLabel(getStudentParticipationStatus(database, student.id, activeWorkspaceId))}`}
                    {getStudentParticipationStatus(database, student.id, activeWorkspaceId) === "present"
                      ? ` · ${getCorrectionStatusLabel(studentCorrectionStatuses.get(student.id) ?? "uncorrected")}`
                      : ""}
                  </option>
                ))}
              </select>
            </Field>
            {selectedStudentRecord && taskCount > 0 ? (
              <p className="status-note text-xs leading-5">
                Korrekturfortschritt: <strong>{scoredTaskCount} von {taskCount}</strong> Punkteingaben erfasst.
              </p>
            ) : null}
            {!selectedStudentRecord ? (
              <p className="status-note text-sm leading-6">Wähle einen Schülercode, um dessen Punkte einzugeben.</p>
            ) : selectedParticipationStatus !== "present" ? (
              <p className="status-note text-sm leading-6">Nicht teilnehmend: {getParticipationStatusLabel(selectedParticipationStatus)}. Für Details kannst du den Status in der Lerngruppenverwaltung ändern.</p>
            ) : null}
          </div>
      </Card>
      </div>
    </div>
  );
};
