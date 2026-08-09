import { KeyboardEvent, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppNavigation, getTabButtonId, getTabPanelId, tabs, type AppTabId as TabId } from "./app/AppNavigation";
import { AppHeader, type GlobalSearchResult } from "./app/AppHeader";
import { AppShell } from "./app/AppShell";
import { AppStatusArea, type AppNotice, type AppNoticeTone } from "./app/AppStatusArea";
import { FirstRunGuide, firstRunGuideSteps } from "./app/FirstRunGuide";
import { StorageLoadingScreen, StorageUnavailableScreen } from "./app/AppStartupScreens";
import { WorkspaceVersionPanel } from "./app/WorkspaceVersionPanel";
import { useWorkspaceVersionController } from "./features/workspaces/useWorkspaceVersionController";
import { useWorkspaceSelectionController } from "./features/workspaces/useWorkspaceSelectionController";
import { useWorkspaceLifecycleController } from "./features/workspaces/useWorkspaceLifecycleController";
import { getNextWorkspaceLabel } from "./domain/workspaces/lifecycle";
import { useWorkspaceContextController } from "./features/workspaces/useWorkspaceContextController";
import {
  DraftBundle,
  DraftWorkspace,
  DraftWorkspaceVersion,
  Exam,
  ExpectationArchiveEntry,
  Section,
  StudentDatabase,
  Task,
  ClassOverviewData,
  GroupAccessMode,
  ThemeMode,
  VisualTheme,
} from "./types";
import type { ExamTemplateDefinition } from "./data/templates";
import { sampleExam } from "./data/sampleExam";
import { calculateExamSummary } from "./utils/calculations";
import {
  mergeArchiveEntries,
  buildArchiveEntryFromExam,
  createEditableExamFromArchive,
} from "./utils/archive";
import {
  loadDraft,
  loadExpectationArchive,
  loadStudentDatabase,
  loadTheme,
  loadVisualTheme,
  saveDraft,
  saveExpectationArchive,
  saveStudentDatabase,
  saveTheme,
  saveVisualTheme,
  StorageWriteConflictError,
  subscribeToStorageFailures,
} from "./utils/storage";
import {
  buildAppBackupFilenameForClass,
  BackupValidationError,
  BackupFailureMetadata,
  buildSchoolYearArchiveFilename,
  clearBackupComplete,
  clearBackupFailure,
  createEncryptedAppBackup,
  createEncryptedSchoolYearWorkspaceArchive,
  describeBackupStatus,
  isEncryptedAppBackup,
  isEncryptedSchoolYearWorkspaceArchive,
  isEncryptedStudentDatabaseBackup,
  loadLastBackupAt,
  loadLastBackupFailure,
  markBackupFailed,
  markBackupComplete,
  parseAppBackup,
  parseSchoolYearWorkspaceArchive,
  parseStudentDatabaseBackup,
} from "./utils/backup";
import { scaleExamPoints } from "./utils/scaling";
import {
  getLinkedSectionPartnerIndex,
  isLinkedSectionFollower,
  isLinkedSectionLeader,
  normalizeSectionLinks,
} from "./utils/sectionLinks";
import {
  normalizeExamWritingSections,
  normalizeWritingSection,
  scaleSectionTasksToTotal,
} from "./utils/writing";
import {
  getNormalizedSectionPointTargets,
  hasSectionPointWeightMismatch,
} from "./utils/sectionWeights";
import { formatDateTime, formatNumber } from "./utils/format";
import { createPasswordVerifier, decryptText, encryptText, verifyPassword } from "./utils/crypto";
import { createDefaultGradeScale, gradeLabelToNumericValue } from "./utils/grades";
import { createGradeScaleGeneratorSettings, getEffectiveGradeBands } from "./utils/gradeScaleGenerator";
import { createEmptyStudentDatabase, isStudentDatabase } from "./utils/studentDatabase";
import {
  addStudentGroup,
  addStudentToGroup,
  buildExamForStudent,
  createStudentGroup,
  getStudentAssessment,
  getStudentCorrectionStatus,
  getEffectiveSignatureDataUrl,
  getStudentGroup,
  getStudentRecord,
  hydrateSensitiveAssessmentsForGroup,
  encryptAndScrubSensitiveAssessmentsForGroups,
  markStudentPrinted,
  removeStudentGroup,
  removeStudentFromGroup,
  scrubSensitiveAssessmentsForGroups,
  scaleTaskScoresForStudents,
  setStudentOrderInGroup,
  updateGroupDefaultSignature,
  updateStudentScore,
  updateStudentSignature,
  updateTeacherComment,
} from "./utils/students";
import {
  downloadCsvFile,
  exportEditableExamDocx,
  exportClassEditableExamDocx,
  exportClassOverviewDocx,
  exportClassOverviewCsv,
  exportGradeScaleDocx,
  exportGradeScaleCsv,
  exportScoringSheetCsv,
  exportScoringSheetOds,
  exportScoringSheetXlsx,
  exportStudentExamCsv,
  openBatchPrintWindow,
  openClassOverviewPrintWindow,
  openGradeScalePrintWindow,
  openPrintPopupHost,
  openPrintWindow,
  openSecurityTokenPrintWindow,
  prepareFileSave,
  resolveCommentTemplate,
} from "./utils/export";
import { ImportSortOptions, buildStudentAlias, parseStudentImportFile, sortImportedStudentRows } from "./utils/studentImport";
import { generateSecurityToken, SecurityTokenCard } from "./utils/securityTokens";
import { ExamHeaderForm } from "./components/ExamHeaderForm";
import { SectionEditor } from "./components/SectionEditor";
import { GradeScaleEditor } from "./components/GradeScaleEditor";
import { SummaryPanel } from "./components/SummaryPanel";
import { ClassOverviewPanel } from "./components/ClassOverviewPanel";
import {
  EDITOR_GRADE_RANGES_ANCHOR_ID,
  EDITOR_GRADE_SCALE_ANCHOR_ID,
  EDITOR_METADATA_ANCHOR_ID,
  EDITOR_POINTS_ANCHOR_ID,
  EDITOR_POINT_SCALING_ANCHOR_ID,
  EDITOR_RESULT_ANCHOR_ID,
  EditorToc,
  getEditorSectionAnchorId,
} from "./components/EditorToc";
import { ReportSummarySection } from "./components/ReportSummarySection";
import { ImportExportControls } from "./components/ImportExportControls";
import { BackupPanel, SchoolYearBackupOption } from "./components/BackupPanel";
import { HomeDashboard } from "./components/HomeDashboard";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { AppFooter } from "./components/AppFooter";
import { PointScaleControl } from "./components/PointScaleControl";
import { GradeScaleRangeSection } from "./components/GradeScaleRangeSection";
import { StudentRosterPanel } from "./components/StudentRosterPanel";
import { StudentSelectionPanel } from "./components/StudentSelectionPanel";
import type { GuidedBuilderTarget, GuidedSectionDraft } from "./components/GuidedExamBuilder";
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LoadingIcon,
  PlusIcon,
} from "./components/icons";
import { Card, DismissibleCallout, Field, IconButton } from "./components/ui";
import { SECTION_CHART_PALETTE } from "./utils/sectionChart";
import { cloneExam, createEmptyExamMeta, withExamMeta } from "./utils/exam";
import { ImportedExamSuggestion } from "./pdf/types";
import { isDemoStorageScope, scopedStorageKey } from "./utils/storageScope";

const GuidedExamBuilder = lazy(async () => {
  const module = await import("./components/GuidedExamBuilder");
  return { default: module.GuidedExamBuilder };
});

const ExpectationArchiveDashboard = lazy(async () => {
  const module = await import("./components/ExpectationArchiveDashboard");
  return { default: module.ExpectationArchiveDashboard };
});

type PendingArchiveOverwrite = {
  existing: ExpectationArchiveEntry;
  incoming: ExpectationArchiveEntry;
};
type PendingTemplateLoad = {
  template: ExamTemplateDefinition;
  target: GuidedBuilderTarget;
  gradeScale: Exam["gradeScale"];
  meta: Exam["meta"];
  targetGroupId: string | null;
  targetTotalPoints: number;
};

type PendingSchoolYearCreation = {
  schoolYear: string;
  course: string;
};
type PendingSectionTotalChange = {
  sectionId: string;
  sectionTitle: string;
  currentTotal: number;
  targetTotal: number;
};
type PendingTaskMaxPointsChange = {
  sectionId: string;
  taskId: string;
  taskTitle: string;
  currentMaxPoints: number;
  targetMaxPoints: number;
  groupId: string;
  groupLabel: string;
  affectedStudentCount: number;
};
type PendingVersionRestore = {
  workspaceId: string;
  workspaceLabel: string;
  version: DraftWorkspaceVersion;
};

type PrintMode = "student" | "class" | null;
type SectionDropIndicator = {
  targetSectionId: string;
  position: "before" | "after";
} | null;
type StorageErrorState = {
  title: string;
  detail: string;
};
type RestoreCheckpoint = {
  draftBundle: DraftBundle;
  archiveEntries: ExpectationArchiveEntry[];
  studentDatabase: StudentDatabase;
  activeGroupId: string;
  activeStudentId: string;
  lastBackupAt: string | null;
  lastBackupFailure: BackupFailureMetadata | null;
};
type PendingImportPreview =
  | {
      kind: "app-backup";
      sourceLabel: string;
      summary: string;
      warning?: string;
      data: {
        draftBundle: DraftBundle;
        archiveEntries: ExpectationArchiveEntry[];
        studentDatabase: StudentDatabase;
        exportedAt: string;
      };
    }
  | {
      kind: "student-database-backup";
      sourceLabel: string;
      summary: string;
      warning?: string;
      data: {
        studentDatabase: StudentDatabase;
        exportedAt: string | null;
      };
    }
  | {
      kind: "schoolyear-workspace-archive";
      sourceLabel: string;
      summary: string;
      warning?: string;
      data: {
        draftBundle: DraftBundle;
        studentDatabase: StudentDatabase;
        schoolYear: string;
        exportedAt: string;
      };
    };

const describeImportError = (error: unknown) =>
  error instanceof BackupValidationError
    ? `${error.message} Fehlercode: ${error.code}.`
    : "Die Sicherungsdatei konnte nicht verarbeitet werden. Fehlercode: BACKUP_UNEXPECTED.";

const UNLOCK_SESSION_TIMEOUT_MS = 1000 * 60 * 15;
const DEMO_GROUP_ID = "demo-lerngruppe-8b";
const DEMO_WORKSPACE_UNIT_4_ID = "demo-klassenarbeit-unit-4";
const DEMO_WORKSPACE_UNIT_5_ID = "demo-klassenarbeit-unit-5";
const DEMO_SEED_VERSION = "student-demo-v4";
const DEMO_SEED_VERSION_KEY = scopedStorageKey("demo-seed-version");
const DEMO_TIMESTAMP = "2026-03-23T09:00:00.000Z";
const DEMO_CLASS_PASSWORD = "demo";
const DEMO_STUDENT_NAMES = [
  "Mia Schneider",
  "Emir Yılmaz",
  "Olena Kovalenko",
  "Aarav Sharma",
  "Hannah Becker",
  "Zeynep Kaya",
  "Maksym Shevchenko",
  "Ananya Patel",
  "Leon Fischer",
  "Elif Demir",
  "Sofia Melnyk",
  "Vihaan Gupta",
  "Greta Wagner",
  "Can Özdemir",
  "Kateryna Bondarenko",
  "Isha Nair",
  "Jonas Weber",
  "Derya Aydın",
  "Andriy Tkachenko",
  "Kabir Singh",
  "Lina Hoffmann",
  "Mert Arslan",
  "Yuliia Kovalchuk",
  "Riya Iyer",
  "Noah Hartmann",
] as const;
const FIRST_RUN_GUIDE_DISMISSED_KEY = scopedStorageKey("first-run-guide-dismissed");
const runtimeQuery = new URLSearchParams(window.location.search);
const isDemoModeEnabled = isDemoStorageScope;
const shouldForceDemoSeed = runtimeQuery.get("resetDemo") === "1" || runtimeQuery.get("freshDemo") === "1";

const hasDismissedFirstRunGuide = () => {
  try {
    return window.localStorage.getItem(FIRST_RUN_GUIDE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};

const markFirstRunGuideDismissed = () => {
  try {
    window.localStorage.setItem(FIRST_RUN_GUIDE_DISMISSED_KEY, "1");
  } catch {
    // The overlay can still be closed for the active session.
  }
};

const getStoredDemoSeedVersion = () => {
  try {
    return window.localStorage.getItem(DEMO_SEED_VERSION_KEY);
  } catch {
    return null;
  }
};

const markDemoSeedCurrent = () => {
  try {
    window.localStorage.setItem(DEMO_SEED_VERSION_KEY, DEMO_SEED_VERSION);
  } catch {
    // Demo seeding still works without the marker; it just cannot persist the upgrade flag.
  }
};

const getWorkspaceDisplayLabel = (workspace: DraftWorkspace | null | undefined) =>
  workspace?.exam.meta.title.trim() || workspace?.label || "Klassenarbeit";

const createTask = (): Task => ({
  id: crypto.randomUUID(),
  title: "Neue Aufgabe",
  description: "",
  category: "Inhalt",
  maxPoints: 5,
  achievedPoints: 0,
  expectation: "",
});

const createImportedTask = (
  draft: ImportedExamSuggestion["sections"][number]["tasks"][number],
  fallbackIndex: number,
): Task => ({
  id: crypto.randomUUID(),
  title: draft.title.trim() || `Aufgabe ${fallbackIndex + 1}`,
  description: draft.description.trim(),
  category: "Inhalt",
  maxPoints: Number.isFinite(draft.maxPoints) ? Math.max(0, draft.maxPoints) : 5,
  achievedPoints: 0,
  expectation: draft.expectation.trim(),
});

const createSection = (): Section => ({
  id: crypto.randomUUID(),
  title: "Neuer Abschnitt",
  description: "",
  weight: 25,
  linkedSectionId: null,
  maxPointsOverride: null,
  note: "",
  tasks: [createTask()],
});

const createImportedSection = (
  draft: ImportedExamSuggestion["sections"][number],
  fallbackIndex: number,
): Section => ({
  id: crypto.randomUUID(),
  title: draft.title.trim() || `Importierter Abschnitt ${fallbackIndex + 1}`,
  description: draft.description.trim(),
  weight: Number.isFinite(draft.weight) ? Math.max(0, draft.weight) : 25,
  linkedSectionId: null,
  maxPointsOverride: null,
  note: draft.note.trim(),
  tasks: draft.tasks.length > 0
    ? draft.tasks.map((task, index) => createImportedTask(task, index))
    : [createTask()],
});

const createEmptyExam = (): Exam => ({
  id: crypto.randomUUID(),
  meta: createEmptyExamMeta(),
  evaluationMode: "direct",
  gradeScale: createDefaultGradeScale(),
  sections: [createSection()],
  printSettings: {
    showExpectations: true,
    showTeacherComment: true,
    compactRows: false,
    showWeightedOverview: false,
  },
});

const createDraftWorkspace = (
  exam: Exam,
  label: string,
  activeArchiveEntryId: string | null = null,
  assignedGroupId: string | null = null,
): DraftWorkspace => ({
  id: crypto.randomUUID(),
  label,
  exam: cloneExam(exam),
  activeArchiveEntryId,
  assignedGroupId,
  updatedAt: new Date().toISOString(),
  versions: [],
});

const createDraftBundle = (exam: Exam, label = "Klassenarbeit 1"): DraftBundle => {
  const workspace = createDraftWorkspace(exam, label);
  return {
    activeWorkspaceId: workspace.id,
    workspaces: [workspace],
  };
};

const reorder = <T,>(items: T[], currentIndex: number, nextIndex: number) => {
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const cloned = [...items];
  const [item] = cloned.splice(currentIndex, 1);
  cloned.splice(nextIndex, 0, item);
  return cloned;
};

const moveBlock = <T,>(
  items: T[],
  startIndex: number,
  endIndex: number,
  insertionIndex: number,
) => {
  const block = items.slice(startIndex, endIndex + 1);
  const remaining = items.filter((_, index) => index < startIndex || index > endIndex);
  const adjustedInsertionIndex =
    insertionIndex > endIndex ? insertionIndex - block.length : insertionIndex;
  const safeInsertionIndex = Math.max(0, Math.min(adjustedInsertionIndex, remaining.length));
  remaining.splice(safeInsertionIndex, 0, ...block);
  return remaining;
};

const normalizeArchiveTitle = (value: string) => value.trim().toLocaleLowerCase("de-DE");

const workspaceMatchesGroup = (workspace: DraftWorkspace, groupId: string) =>
  !groupId || workspace.assignedGroupId === groupId;

const workspaceMatchesSchoolYear = (workspace: DraftWorkspace, schoolYearFilter: string) =>
  schoolYearFilter === "all" || getWorkspaceSchoolYear(workspace) === schoolYearFilter;

const getWorkspaceCorrectionSnapshot = (
  workspace: DraftWorkspace,
  group: ReturnType<typeof getStudentGroup>,
  database: StudentDatabase,
) => {
  const relevantStudents = (group?.students ?? []).filter((student) => !student.isAbsent);
  const correctedCount = relevantStudents.reduce((count, student) => {
    const correctionStatus = getStudentCorrectionStatus(
      workspace.exam,
      getStudentAssessment(database, student.id, workspace.id),
    );
    return correctionStatus === "corrected" ? count + 1 : count;
  }, 0);

  return {
    correctedCount,
    relevantStudentCount: relevantStudents.length,
    allCorrected: relevantStudents.length > 0 && correctedCount === relevantStudents.length,
  };
};

const pickPreferredWorkspaceForGroup = (
  workspaces: DraftWorkspace[],
  group: ReturnType<typeof getStudentGroup>,
  database: StudentDatabase,
) =>
  [...workspaces].sort((left, right) => {
    const leftSnapshot = getWorkspaceCorrectionSnapshot(left, group, database);
    const rightSnapshot = getWorkspaceCorrectionSnapshot(right, group, database);

    if (leftSnapshot.allCorrected !== rightSnapshot.allCorrected) {
      return leftSnapshot.allCorrected ? -1 : 1;
    }

    if (leftSnapshot.correctedCount !== rightSnapshot.correctedCount) {
      return rightSnapshot.correctedCount - leftSnapshot.correctedCount;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  })[0] ?? null;

const getWorkspaceSchoolYear = (workspace: DraftWorkspace) => workspace.exam.meta.schoolYear.trim();

const getSchoolYearLabel = (schoolYear: string) => schoolYear || "Ohne Schuljahr";

const getAssessmentWorkspaceId = (assessment: { workspaceId: string | null }) =>
  assessment.workspaceId?.trim() || null;

const createStudentDatabaseForWorkspaceArchive = (
  database: StudentDatabase,
  workspaces: DraftWorkspace[],
): StudentDatabase => {
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const archivedAssessments = Object.fromEntries(
    Object.entries(database.assessments).filter(([, assessment]) => {
      const workspaceId = getAssessmentWorkspaceId(assessment);
      return Boolean(workspaceId && workspaceIds.has(workspaceId));
    }),
  );
  const referencedStudentIds = new Set(
    Object.values(archivedAssessments).map((assessment) => assessment.studentId),
  );
  const referencedGroupIds = new Set(
    workspaces
      .map((workspace) => workspace.assignedGroupId)
      .filter((groupId): groupId is string => Boolean(groupId)),
  );
  const groups = database.groups.filter((group) => {
    if (referencedGroupIds.has(group.id)) return true;
    return group.students.some((student) => referencedStudentIds.has(student.id));
  });

  return {
    version: database.version,
    groups,
    assessments: archivedAssessments,
    updatedAt: new Date().toISOString(),
  };
};

const removeWorkspaceAssessments = (database: StudentDatabase, workspaceIds: Set<string>): StudentDatabase => ({
  ...database,
  assessments: Object.fromEntries(
    Object.entries(database.assessments).filter(([, assessment]) => {
      const workspaceId = getAssessmentWorkspaceId(assessment);
      return !workspaceId || !workspaceIds.has(workspaceId);
    }),
  ),
  updatedAt: new Date().toISOString(),
});

const mergeStudentDatabases = (
  current: StudentDatabase,
  incoming: StudentDatabase,
): StudentDatabase => {
  const currentGroupIds = new Set(current.groups.map((group) => group.id));
  const mergedGroups = [
    ...current.groups,
    ...incoming.groups.filter((group) => !currentGroupIds.has(group.id)),
  ];

  return {
    version: Math.max(current.version, incoming.version),
    groups: mergedGroups,
    assessments: {
      ...current.assessments,
      ...incoming.assessments,
    },
    updatedAt: new Date().toISOString(),
  };
};

const toFiniteNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const getMedian = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
};

const MAX_WORKSPACE_VERSIONS = 10;
const WORKSPACE_VERSION_INTERVAL_MS = 1000 * 60 * 15;

const cloneExamSnapshot = (exam: Exam): Exam => cloneExam(exam);

function App() {
  const defaultPrintSettings = {
    showExpectations: true,
    showTeacherComment: true,
    compactRows: false,
    showWeightedOverview: false,
  };

  const normalizeExamStructure = (nextExam: Exam) => {
    const defaultGradeScale = createDefaultGradeScale();

    return normalizeSectionLinks(
      normalizeExamWritingSections({
          ...nextExam,
          id: nextExam.id || crypto.randomUUID(),
          meta: {
            schoolYear: nextExam.meta?.schoolYear ?? "",
            subject: nextExam.meta?.subject ?? "",
            gradeLevel: nextExam.meta?.gradeLevel ?? "",
            course: nextExam.meta?.course ?? "",
            teacher: nextExam.meta?.teacher ?? "",
            examDate: nextExam.meta?.examDate ?? "",
            title: nextExam.meta?.title ?? "",
            unit: nextExam.meta?.unit ?? "",
            notes: nextExam.meta?.notes ?? "",
          },
          evaluationMode: "direct",
          gradeScale: {
            ...defaultGradeScale,
            ...nextExam.gradeScale,
            mode: nextExam.gradeScale?.mode === "points" ? "points" : "percentage",
            generator: {
              ...createGradeScaleGeneratorSettings(),
              ...nextExam.gradeScale?.generator,
              // Accept older persisted values and normalize them into the current source enum.
              source:
                ((nextExam.gradeScale?.generator as { source?: string } | undefined)?.source === "notengenerator" ||
                  (nextExam.gradeScale?.generator as { source?: string } | undefined)?.source === "rotering")
                  ? "notengenerator"
                  : "manual",
              accumulationMode:
                nextExam.gradeScale?.generator?.accumulationMode === "top" ||
                nextExam.gradeScale?.generator?.accumulationMode === "bottom"
                  ? nextExam.gradeScale.generator.accumulationMode
                  : "middle",
              recommendedStage:
                nextExam.gradeScale?.generator?.recommendedStage === "sek1" ||
                nextExam.gradeScale?.generator?.recommendedStage === "sek2"
                  ? nextExam.gradeScale.generator.recommendedStage
                  : null,
            },
            schoolMode:
              nextExam.gradeScale?.schoolMode === "numeric" || nextExam.gradeScale?.schoolMode === "verbal"
                ? nextExam.gradeScale.schoolMode
                : "numericWithComment",
            bands:
              nextExam.gradeScale?.bands?.map((band) => ({
                id: band.id || crypto.randomUUID(),
                label: band.label ?? "",
                verbalLabel: band.verbalLabel ?? "",
                lowerBound: toFiniteNumber(band.lowerBound),
                color: band.color ?? "#64748b",
              })) ?? defaultGradeScale.bands,
          },
          sections: (nextExam.sections ?? []).map((section) => ({
            id: section.id || crypto.randomUUID(),
            title: section.title ?? "",
            description: section.description ?? "",
            weight: toFiniteNumber(section.weight),
            linkedSectionId: section.linkedSectionId ?? null,
            maxPointsOverride:
              section.maxPointsOverride == null ? null : toFiniteNumber(section.maxPointsOverride),
            note: section.note ?? "",
            tasks: (section.tasks ?? []).map((task) => ({
              id: task.id || crypto.randomUUID(),
              title: task.title ?? "",
              description: task.description ?? "",
              category: task.category ?? "",
              maxPoints: toFiniteNumber(task.maxPoints),
              achievedPoints: toFiniteNumber(task.achievedPoints),
              expectation: task.expectation ?? "",
            })),
          })),
          printSettings: {
            ...defaultPrintSettings,
            ...(nextExam.printSettings ?? {}),
          },
        }),
    );
  };

  const createInitialDraftBundle = () => createDraftBundle(normalizeExamStructure(createEmptyExam()));
  const createDemoExam = (metaPatch: Partial<Exam["meta"]> = {}) => {
    const source = cloneExam(sampleExam);
    return normalizeExamStructure({
      ...source,
      id: crypto.randomUUID(),
      meta: { ...source.meta, ...metaPatch },
      sections: source.sections.map((section) => ({
        ...section,
        id: crypto.randomUUID(),
        tasks: section.tasks.map((task) => ({ ...task, id: crypto.randomUUID() })),
      })),
    });
  };
  const createDemoDraftBundle = () => {
    const unit4Workspace = createDraftWorkspace(
      createDemoExam({ examDate: "2026-03-23" }),
      "Englisch · Unit 4",
      null,
      DEMO_GROUP_ID,
    );
    const unit5Exam = createDemoExam({
      examDate: "2026-05-15",
      title: "Englisch-Klassenarbeit Unit 5",
      unit: "Unit 5 · Across Cultures",
      notes: "Unit 5: Leseverstehen, Sprachmittlung und Schreiben. Die Aufgabenstruktur ist bewusst mit Unit 4 vergleichbar, damit Lernfortschritte sichtbar bleiben.",
    });
    unit5Exam.sections[0].tasks[0] = {
      ...unit5Exam.sections[0].tasks[0],
      title: "Reading: Statements and evidence",
      description: "Ordne Aussagen einem Erfahrungsbericht über einen Schüleraustausch zu und belege sie mit passenden Textstellen.",
    };
    unit5Exam.sections[1].tasks[0] = {
      ...unit5Exam.sections[1].tasks[0],
      title: "Language: Future forms and conditionals",
      description: "Verwende passende Zukunftsformen und conditional sentences in einem Austausch-Kontext.",
    };
    unit5Exam.sections[2].tasks[0] = {
      ...unit5Exam.sections[2].tasks[0],
      title: "Writing: Exchange blog post",
      description: "Schreibe einen strukturierten Blogbeitrag über deine ersten Erfahrungen im Schüleraustausch.",
    };
    const unit5Workspace = createDraftWorkspace(unit5Exam, "Englisch · Unit 5", null, DEMO_GROUP_ID);

    return {
      activeWorkspaceId: DEMO_WORKSPACE_UNIT_5_ID,
      workspaces: [
        {
          ...unit4Workspace,
          id: DEMO_WORKSPACE_UNIT_4_ID,
          updatedAt: "2026-03-23T09:00:00.000Z",
        },
        {
          ...unit5Workspace,
          id: DEMO_WORKSPACE_UNIT_5_ID,
          updatedAt: DEMO_TIMESTAMP,
        },
      ],
    };
  };
  const createDemoStudentDatabase = async (workspaces: DraftWorkspace[]): Promise<StudentDatabase> => {
    const passwordVerifier = await createPasswordVerifier(DEMO_GROUP_ID, DEMO_CLASS_PASSWORD);
    const students = await Promise.all(
      DEMO_STUDENT_NAMES.map(async (fullName, index) => ({
        id: `demo-student-${index + 1}`,
        alias: `Student ${index + 1}`,
        encryptedName: await encryptText(fullName, DEMO_CLASS_PASSWORD),
        isAbsent: index === DEMO_STUDENT_NAMES.length - 1,
        createdAt: DEMO_TIMESTAMP,
      })),
    );
    const snapScore = (value: number, maxPoints: number) =>
      Math.min(maxPoints, Math.max(0, Math.round(value * 2) / 2));
    const basePerformance = [
      0.78, 0.68, 0.82, 0.59, 0.9, 0.64, 0.74, 0.54, 0.86, 0.71, 0.61, 0.8,
      0.57, 0.76, 0.66, 0.84, 0.69, 0.62, 0.88, 0.58, 0.73, 0.65, 0.77, 0.55,
    ];
    const skillProfiles = [
      [0.06, -0.08, 0.01, -0.05],
      [-0.03, 0.05, -0.05, 0.02],
      [0.04, 0.02, 0.06, 0.03],
      [-0.06, -0.03, 0.04, -0.06],
      [0.08, 0.05, -0.02, 0.04],
      [-0.02, -0.07, -0.04, -0.02],
      [0.03, 0.01, 0.05, -0.03],
      [-0.05, 0.03, -0.06, 0.01],
    ];
    const unit5Development = [-0.01, 0.03, 0.02, 0.04, 0.01, -0.02, 0.03, 0.02];
    const assessments = Object.fromEntries(
      workspaces.flatMap((workspace, workspaceIndex) =>
        students
          .filter((student) => !student.isAbsent)
          .map((student, studentIndex) => {
            const profile = skillProfiles[studentIndex % skillProfiles.length];
            const taskScores = Object.fromEntries(
              workspace.exam.sections.flatMap((section, sectionIndex) =>
                section.tasks.map((task, taskIndex) => {
                  const development = workspaceIndex === 1 ? unit5Development[studentIndex % unit5Development.length] : 0;
                  const taskVariation = ((taskIndex % 3) - 1) * 0.01;
                  const sectionDevelopment = workspaceIndex === 1 && sectionIndex === 1 ? 0.01 : 0;
                  const percentage = Math.min(
                    0.96,
                    Math.max(0.32, basePerformance[studentIndex] + profile[sectionIndex] + development + sectionDevelopment + taskVariation),
                  );
                  return [task.id, snapScore(task.maxPoints * percentage, task.maxPoints)];
                }),
              ),
            );

            return [
              `${workspace.id}::${student.id}`,
              {
                workspaceId: workspace.id,
                studentId: student.id,
                taskScores,
                encryptedTaskScores: null,
                teacherComment: "Demo-Kommentar: {alias} zeigt über beide Klassenarbeiten ein individuelles, nachvollziehbares Leistungsprofil.",
                signatureDataUrl: null,
                encryptedTeacherComment: null,
                encryptedSignatureDataUrl: null,
                updatedAt: workspace.updatedAt,
                printedAt: null,
              },
            ] as const;
          }),
      ),
    );

    return {
      version: 1,
      groups: [
        {
          id: DEMO_GROUP_ID,
          subject: "Englisch",
          className: "8b Demo",
          passwordVerifier,
          defaultSignatureDataUrl: null,
          students,
          createdAt: DEMO_TIMESTAMP,
          updatedAt: DEMO_TIMESTAMP,
        },
      ],
      assessments,
      updatedAt: DEMO_TIMESTAMP,
    };
  };

  const getSectionBlockBounds = (sections: Section[], sectionId: string) => {
    const currentIndex = sections.findIndex((section) => section.id === sectionId);
    if (currentIndex === -1) return null;

    const partnerIndex = getLinkedSectionPartnerIndex(sections, currentIndex);
    return partnerIndex === -1
      ? { startIndex: currentIndex, endIndex: currentIndex }
      : {
          startIndex: Math.min(currentIndex, partnerIndex),
          endIndex: Math.max(currentIndex, partnerIndex),
        };
  };

  const [draftBundle, setDraftBundle] = useState<DraftBundle>(() =>
    createInitialDraftBundle(),
  );
  const [archiveEntries, setArchiveEntries] = useState<ExpectationArchiveEntry[]>([]);
  const [studentDatabase, setStudentDatabase] = useState<StudentDatabase>(() => createEmptyStudentDatabase());
  const studentDatabaseRef = useRef(studentDatabase);
  const skipInitialDraftPersistenceRef = useRef(false);
  const skipInitialStudentDatabasePersistenceRef = useRef(false);
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => loadVisualTheme());
  const [isAppFullscreen, setIsAppFullscreen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => !hasDismissedFirstRunGuide());
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const guideDialogRef = useRef<HTMLDivElement | null>(null);
  const guideTitleRef = useRef<HTMLHeadingElement | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string>("");
  const [activeStudentId, setActiveStudentId] = useState<string>("");
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<StorageErrorState | null>(null);
  const [appNotice, setAppNotice] = useState<AppNotice | null>(null);
  const unlockedGroupPasswordsRef = useRef<Record<string, string>>({});
  const [unlockedGroupIds, setUnlockedGroupIds] = useState<string[]>([]);
  const [globalSearchStudentNames, setGlobalSearchStudentNames] = useState<Record<string, string>>({});
  const [sensitiveSearchSessionVersion, setSensitiveSearchSessionVersion] = useState(0);
  const searchNameResolutionVersionRef = useRef(0);
  const unlockActivityAtRef = useRef<number>(Date.now());
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => loadLastBackupAt());
  const [lastBackupFailure, setLastBackupFailure] = useState(() => loadLastBackupFailure());
  const [restoreCheckpoint, setRestoreCheckpoint] = useState<RestoreCheckpoint | null>(null);
  const [pendingImportPreview, setPendingImportPreview] = useState<PendingImportPreview | null>(null);
  const [restoreOverwriteConfirmed, setRestoreOverwriteConfirmed] = useState(false);
  const [preRestoreBackupPassphrase, setPreRestoreBackupPassphrase] = useState("");
  const [preRestoreBackupError, setPreRestoreBackupError] = useState("");
  const [preRestoreBackupSaving, setPreRestoreBackupSaving] = useState(false);
  const [quickBackupDialogOpen, setQuickBackupDialogOpen] = useState(false);
  const [quickBackupPassphrase, setQuickBackupPassphrase] = useState("");
  const [quickBackupError, setQuickBackupError] = useState("");
  const [quickBackupSaving, setQuickBackupSaving] = useState(false);
  const [localSaveState, setLocalSaveState] = useState<"saving" | "saved" | "failed">("saved");
  const pendingLocalSaveCountRef = useRef(0);
  const hasLocalSaveFailureRef = useRef(false);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [activeSchoolYearFilter, setActiveSchoolYearFilter] = useState<string>("all");
  const [pendingSchoolYearCreation, setPendingSchoolYearCreation] = useState<PendingSchoolYearCreation | null>(null);
  const tabButtonRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    home: null,
    groups: null,
    guidedBuilder: null,
    builder: null,
    archive: null,
    backup: null,
  });

  const trackLocalSave = useCallback((write: Promise<unknown>) => {
    pendingLocalSaveCountRef.current += 1;
    setLocalSaveState("saving");

    void write.then(
      () => {
        pendingLocalSaveCountRef.current = Math.max(0, pendingLocalSaveCountRef.current - 1);
        if (pendingLocalSaveCountRef.current === 0 && !hasLocalSaveFailureRef.current) {
          setLocalSaveState("saved");
        }
      },
      () => {
        pendingLocalSaveCountRef.current = Math.max(0, pendingLocalSaveCountRef.current - 1);
        setLocalSaveState("failed");
      },
    );
  }, []);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [sectionDropIndicator, setSectionDropIndicator] = useState<SectionDropIndicator>(null);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<string[]>([]);
  const [templateToLoad, setTemplateToLoad] = useState<PendingTemplateLoad | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [archiveEntryToDelete, setArchiveEntryToDelete] = useState<ExpectationArchiveEntry | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<DraftWorkspace | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; label: string; studentCount: number } | null>(null);
  const [pendingArchiveOverwrite, setPendingArchiveOverwrite] = useState<PendingArchiveOverwrite | null>(null);
  const [pendingSectionTotalChange, setPendingSectionTotalChange] = useState<PendingSectionTotalChange | null>(null);
  const [pendingTaskMaxPointsChange, setPendingTaskMaxPointsChange] = useState<PendingTaskMaxPointsChange | null>(null);
  const [pendingVersionRestore, setPendingVersionRestore] = useState<PendingVersionRestore | null>(null);
  const [scalePendingTaskScores, setScalePendingTaskScores] = useState(false);
  const [printPasswordDialogOpen, setPrintPasswordDialogOpen] = useState(false);
  const [printPasswordInput, setPrintPasswordInput] = useState("");
  const [pendingPrintMode, setPendingPrintMode] = useState<PrintMode>(null);
  const [headerUnlockDialogOpen, setHeaderUnlockDialogOpen] = useState(false);
  const [headerUnlockPasswordInput, setHeaderUnlockPasswordInput] = useState("");
  const [headerUnlockError, setHeaderUnlockError] = useState("");
  const [headerUnlockLoading, setHeaderUnlockLoading] = useState(false);
  const [pendingSecurityTokenCards, setPendingSecurityTokenCards] = useState<SecurityTokenCard[]>([]);
  const [showGradeScaleEditor, setShowGradeScaleEditor] = useState(false);
  const [pointsAndGradeSectionCollapsed, setPointsAndGradeSectionCollapsed] = useState(false);
  const [versionListCollapsed, setVersionListCollapsed] = useState(true);
  const [loadedExamTemplates, setLoadedExamTemplates] = useState<ExamTemplateDefinition[] | null>(null);
  const completedCorrectionCelebrationKeysRef = useRef<Record<string, boolean>>({});
  const lastVersionedExamByWorkspaceRef = useRef<Record<string, string>>({});
  const previousActiveGroupIdRef = useRef<string>("");
  const { saveVersion: saveWorkspaceVersion, restoreVersion: restoreWorkspaceVersion } = useWorkspaceVersionController({
    draftBundle,
    setDraftBundle,
    lastVersionedExamByWorkspaceRef,
    maxVersions: MAX_WORKSPACE_VERSIONS,
    cloneExam: cloneExamSnapshot,
    normalizeExam: normalizeExamStructure,
    onRestoreCompleted: () => {
      setPendingVersionRestore(null);
      setCollapsedSectionIds([]);
    },
  });
  const { selectWorkspace: setActiveWorkspaceId } = useWorkspaceSelectionController({
    setDraftBundle,
    onWorkspaceSelected: () => setCollapsedSectionIds([]),
  });
  const { addWorkspace, removeWorkspace } = useWorkspaceLifecycleController({
    activeGroupId,
    setDraftBundle,
    lastVersionedExamByWorkspaceRef,
    normalizeExam: normalizeExamStructure,
    createWorkspace: createDraftWorkspace,
    onLifecycleChanged: () => setCollapsedSectionIds([]),
  });

  const pushNotice = (tone: AppNoticeTone, title: string, detail?: string) => {
    setAppNotice({
      id: Date.now(),
      tone,
      title,
      detail,
    });
  };

  const clearSensitiveGlobalSearch = () => {
    searchNameResolutionVersionRef.current += 1;
    setGlobalSearchStudentNames({});
    setSensitiveSearchSessionVersion((current) => current + 1);
  };

  const lockUnlockedGroupsWithSnapshot = (
    passwordByGroupId: Record<string, string>,
    notice?: { title: string; detail?: string; tone?: AppNoticeTone },
  ) => {
    const lockedGroupIds = Object.keys(passwordByGroupId);
    if (lockedGroupIds.length === 0) {
      if (notice) {
        pushNotice(notice.tone ?? "warning", notice.title, notice.detail);
      }
      return;
    }

    void (async () => {
      try {
        const protectedDatabase = await encryptAndScrubSensitiveAssessmentsForGroups(
          studentDatabaseRef.current,
          passwordByGroupId,
        );
        setStudentDatabase(protectedDatabase);
      } catch (error) {
        console.error("Failed to encrypt assessments before locking", error);
        pushNotice(
          "danger",
          "Sperren nicht vollständig abgeschlossen",
          "Die Bewertungsdaten konnten vor dem Sperren nicht neu verschlüsselt werden. Bitte entsperre die Klasse erneut und exportiere ein Backup.",
        );
      }
    })();

    if (notice) {
      pushNotice(notice.tone ?? "warning", notice.title, notice.detail);
    }
  };

  const clearUnlockedGroups = (notice?: { title: string; detail?: string; tone?: AppNoticeTone }) => {
    const lockedPasswords = { ...unlockedGroupPasswordsRef.current };
    clearSensitiveGlobalSearch();
    unlockedGroupPasswordsRef.current = {};
    setUnlockedGroupIds([]);
    lockUnlockedGroupsWithSnapshot(lockedPasswords, notice);
  };

  useEffect(() => {
    if (activeTab !== "guidedBuilder" || loadedExamTemplates) return;

    let cancelled = false;

    void import("./data/templates")
      .then((module) => {
        if (!cancelled) {
          setLoadedExamTemplates(module.examTemplates);
        }
      })
      .catch((error) => {
        console.error("Failed to load exam templates", error);
        if (!cancelled) {
          pushNotice("danger", "Templates konnten nicht geladen werden");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, loadedExamTemplates]);

  useEffect(() => {
    if (activeTab !== "guidedBuilder" && pendingSchoolYearCreation) {
      setPendingSchoolYearCreation(null);
    }
  }, [activeTab, pendingSchoolYearCreation]);

  const lockGroupSession = (groupId: string, notice?: { title: string; detail?: string; tone?: AppNoticeTone }) => {
    if (!groupId) return;

    const nextPasswords = { ...unlockedGroupPasswordsRef.current };
    if (!(groupId in nextPasswords)) return;

    const lockedPassword = nextPasswords[groupId];
    delete nextPasswords[groupId];
    clearSensitiveGlobalSearch();
    unlockedGroupPasswordsRef.current = nextPasswords;
    setUnlockedGroupIds((current) => current.filter((id) => id !== groupId));
    lockUnlockedGroupsWithSnapshot({ [groupId]: lockedPassword }, notice);
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [storedDraft, storedArchiveEntries, storedStudentDatabase] = await Promise.all([
          loadDraft(),
          loadExpectationArchive(),
          loadStudentDatabase(),
        ]);

        if (cancelled) return;

        const hasCurrentDemoSeed = getStoredDemoSeedVersion() === DEMO_SEED_VERSION;
        const hasDemoWorkspaces = [DEMO_WORKSPACE_UNIT_4_ID, DEMO_WORKSPACE_UNIT_5_ID].every((workspaceId) =>
          storedDraft?.workspaces.some((workspace) => workspace.id === workspaceId),
        );
        const hasDemoGroup = storedStudentDatabase.groups.some((group) => group.id === DEMO_GROUP_ID);
        const shouldSeedDemoWorkspace =
          isDemoModeEnabled && (shouldForceDemoSeed || !hasCurrentDemoSeed || !hasDemoWorkspaces || !hasDemoGroup);

        const nextDraftBundle = shouldSeedDemoWorkspace ? createDemoDraftBundle() : storedDraft ?? createInitialDraftBundle();
        const nextArchiveEntries = shouldSeedDemoWorkspace ? [] : storedArchiveEntries;
        const nextStudentDatabase = shouldSeedDemoWorkspace
          ? await createDemoStudentDatabase(nextDraftBundle.workspaces)
          : storedStudentDatabase;

        if (shouldSeedDemoWorkspace) {
          markDemoSeedCurrent();
        }

        // Loading must be read-only. Otherwise simply opening a second tab would create a new
        // storage revision and make the first tab appear stale without any user change.
        skipInitialDraftPersistenceRef.current = !shouldSeedDemoWorkspace;
        skipInitialStudentDatabasePersistenceRef.current = !shouldSeedDemoWorkspace;
        setDraftBundle(nextDraftBundle);
        setArchiveEntries(nextArchiveEntries);
        setStudentDatabase(nextStudentDatabase);
        setActiveGroupId(nextStudentDatabase.groups[0]?.id ?? "");
        setActiveStudentId(nextStudentDatabase.groups[0]?.students[0]?.id ?? "");
        if (shouldSeedDemoWorkspace) {
          setActiveTab("home");
        }
        setStorageError(null);
        setStorageReady(true);
      } catch (error) {
        console.error("SQLite storage initialization failed", error);
        if (cancelled) return;
        setStorageError({
          title: "Lokaler Speicher konnte nicht geöffnet werden",
          detail:
            error instanceof Error
              ? `${error.message} Bitte lade die Seite neu. Wenn der Fehler bleibt, sichere vorhandene Backups und prüfe Browser-Speicher, private Fenster oder blockierte IndexedDB-Berechtigungen.`
              : "Bitte lade die Seite neu. Wenn der Fehler bleibt, prüfe Browser-Speicher, private Fenster oder blockierte IndexedDB-Berechtigungen.",
        });
        setStorageReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      subscribeToStorageFailures((error) => {
        const isConflict = error instanceof StorageWriteConflictError;
        hasLocalSaveFailureRef.current = true;
        setLocalSaveState("failed");
        setStorageError({
          title: isConflict ? "Arbeitsstand wurde in einem anderen Tab geändert" : "Lokaler Speicherfehler",
          detail: isConflict
            ? "Diese Seite speichert keine weiteren Änderungen, damit kein neuerer Arbeitsstand überschrieben wird. Bitte schließe den anderen Tab und lade diese Seite neu."
            : "Eine Änderung konnte nicht sicher im Browser gespeichert werden. Bitte lade die Seite neu und prüfe anschließend deine letzte verschlüsselte Sicherung.",
        });
      }),
    [],
  );

  useEffect(() => {
    if (!storageReady) return;
    if (skipInitialDraftPersistenceRef.current) {
      skipInitialDraftPersistenceRef.current = false;
      return;
    }
    trackLocalSave(saveDraft(draftBundle));
  }, [draftBundle, storageReady, trackLocalSave]);

  useEffect(() => {
    if (!storageReady) return;
    if (skipInitialStudentDatabasePersistenceRef.current) {
      skipInitialStudentDatabasePersistenceRef.current = false;
      return;
    }
    const unlockedPasswordsSnapshot = { ...unlockedGroupPasswordsRef.current };
    trackLocalSave(saveStudentDatabase(studentDatabase, (groupId) => unlockedPasswordsSnapshot[groupId] ?? null));
  }, [studentDatabase, storageReady, trackLocalSave]);

  useEffect(() => {
    studentDatabaseRef.current = studentDatabase;
  }, [studentDatabase]);

  useEffect(() => {
    const resolutionVersion = ++searchNameResolutionVersionRef.current;
    const unlockedGroupIdSet = new Set(unlockedGroupIds);
    const unlockedGroups = studentDatabase.groups.filter((group) => unlockedGroupIdSet.has(group.id));
    const unlockedStudentIds = new Set(unlockedGroups.flatMap((group) => group.students.map((student) => student.id)));

    setGlobalSearchStudentNames((current) =>
      Object.fromEntries(Object.entries(current).filter(([studentId]) => unlockedStudentIds.has(studentId))),
    );

    if (unlockedGroups.length === 0) return;

    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        unlockedGroups.flatMap((group) => {
          const password = unlockedGroupPasswordsRef.current[group.id]?.trim() ?? "";
          if (!password) return [];

          return group.students.map(async (student) => {
            try {
              const fullName = await decryptText(student.encryptedName, password);
              return [group.id, password, student.id, fullName] as const;
            } catch {
              return null;
            }
          });
        }),
      );

      if (cancelled || resolutionVersion !== searchNameResolutionVersionRef.current) return;

      const resolvedNames = Object.fromEntries(
        entries.flatMap((entry) =>
          entry && unlockedGroupPasswordsRef.current[entry[0]] === entry[1] ? [[entry[2], entry[3]] as const] : [],
        ),
      );
      setGlobalSearchStudentNames(resolvedNames);
    })();

    return () => {
      cancelled = true;
    };
  }, [studentDatabase.groups, unlockedGroupIds]);

  useEffect(() => {
    const refreshUnlockActivity = () => {
      unlockActivityAtRef.current = Date.now();
    };

    refreshUnlockActivity();
    window.addEventListener("pointerdown", refreshUnlockActivity);
    window.addEventListener("keydown", refreshUnlockActivity);
    window.addEventListener("focus", refreshUnlockActivity);

    return () => {
      window.removeEventListener("pointerdown", refreshUnlockActivity);
      window.removeEventListener("keydown", refreshUnlockActivity);
      window.removeEventListener("focus", refreshUnlockActivity);
    };
  }, []);

  useEffect(() => {
    if (unlockedGroupIds.length === 0) return;

    const intervalId = window.setInterval(() => {
      if (Date.now() - unlockActivityAtRef.current < UNLOCK_SESSION_TIMEOUT_MS) return;

      clearUnlockedGroups();
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [unlockedGroupIds]);

  useEffect(() => {
    if (!storageReady) return;

    lastVersionedExamByWorkspaceRef.current = draftBundle.workspaces.reduce<Record<string, string>>((accumulator, workspace) => {
      accumulator[workspace.id] = JSON.stringify(workspace.exam);
      return accumulator;
    }, {});
  }, [storageReady]);

  useEffect(() => {
    saveTheme(theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    saveVisualTheme(visualTheme);
    document.documentElement.dataset.theme = visualTheme;
  }, [visualTheme]);

  useEffect(() => {
    if (!guideOpen) return;
    window.requestAnimationFrame(() => guideTitleRef.current?.focus());
  }, [guideOpen]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsAppFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  const toggleAppFullscreen = () => {
    if (!document.fullscreenEnabled) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void (appShellRef.current ?? document.documentElement).requestFullscreen();
  };

  const openUserGuide = () => {
    setGuideStepIndex(0);
    setGuideOpen(true);
  };

  const closeUserGuide = (dismissPermanently = false) => {
    if (dismissPermanently) {
      markFirstRunGuideDismissed();
    }
    setGuideOpen(false);
  };

  const activateGuideStepTarget = (tabId: TabId) => {
    setActiveTab(tabId);
    setGuideOpen(false);
    window.requestAnimationFrame(() => focusTabButton(tabId));
  };

  const handleGuideKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeUserGuide(false);
      return;
    }

    if (event.key !== "Tab") return;

    const dialog = guideDialogRef.current;
    if (!dialog) return;

    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (!focusableElements.includes(activeElement as HTMLElement)) {
      event.preventDefault();
      (event.shiftKey ? lastElement : firstElement).focus();
      return;
    }

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const focusTabButton = (tabId: TabId) => {
    tabButtonRefs.current[tabId]?.focus();
  };

  const activateTab = (tabId: TabId) => {
    setActiveTab(tabId);
    window.requestAnimationFrame(() => focusTabButton(tabId));
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTabId: TabId) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTabId);
    if (currentIndex === -1) return;

    const nextIndex = (() => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          return (currentIndex + 1) % tabs.length;
        case "ArrowLeft":
        case "ArrowUp":
          return (currentIndex - 1 + tabs.length) % tabs.length;
        case "Home":
          return 0;
        case "End":
          return tabs.length - 1;
        default:
          return null;
      }
    })();

    if (nextIndex === null) return;
    event.preventDefault();
    activateTab(tabs[nextIndex].id);
  };

  useEffect(() => {
    const currentGroup = getStudentGroup(studentDatabase, activeGroupId);
    if (!currentGroup) {
      const fallbackGroup = studentDatabase.groups[0] ?? null;
      setActiveGroupId(fallbackGroup?.id ?? "");
      setActiveStudentId(fallbackGroup?.students[0]?.id ?? "");
      return;
    }

    if (!currentGroup.students.some((student) => student.id === activeStudentId)) {
      setActiveStudentId(currentGroup.students[0]?.id ?? "");
    }
  }, [studentDatabase, activeGroupId, activeStudentId]);

  const selectedStudent =
    activeGroupId && activeStudentId ? { groupId: activeGroupId, studentId: activeStudentId } : null;
  const schoolYearNavigationOptions = useMemo(() => {
    const schoolYears = Array.from(
      new Set(draftBundle.workspaces.map((workspace) => getWorkspaceSchoolYear(workspace))),
    ).sort((left, right) => getSchoolYearLabel(left).localeCompare(getSchoolYearLabel(right), "de-DE", { numeric: true }));
    if (activeSchoolYearFilter !== "all" && !schoolYears.includes(activeSchoolYearFilter)) {
      schoolYears.push(activeSchoolYearFilter);
    }
    return schoolYears;
  }, [activeSchoolYearFilter, draftBundle.workspaces]);
  const visibleWorkspaces = useMemo(
    () =>
      draftBundle.workspaces.filter(
        (workspace) =>
          workspaceMatchesGroup(workspace, activeGroupId) &&
          workspaceMatchesSchoolYear(workspace, activeSchoolYearFilter),
      ),
    [activeGroupId, activeSchoolYearFilter, draftBundle.workspaces],
  );
  const globalSearchResults = useMemo<GlobalSearchResult[]>(
    () => {
      const unlockedGroupIdSet = new Set(unlockedGroupIds);

      return [
      ...draftBundle.workspaces.map((workspace) => ({
        id: `workspace:${workspace.id}`,
        kind: "workspace" as const,
        label: getWorkspaceDisplayLabel(workspace),
        detail: [
          workspace.exam.meta.subject,
          workspace.exam.meta.course,
          workspace.exam.meta.schoolYear,
          workspace.exam.meta.examDate,
        ].filter(Boolean).join(" · ") || "Klassenarbeit",
      })),
      ...studentDatabase.groups.flatMap((group) =>
        group.students.map((student) => ({
          id: `student:${student.id}`,
          kind: "student" as const,
          label: unlockedGroupIdSet.has(group.id) && globalSearchStudentNames[student.id]
            ? `${globalSearchStudentNames[student.id]} · ${student.alias}`
            : student.alias,
          detail: `${group.subject} · ${group.className}${student.isAbsent ? " · abwesend" : ""}`,
        })),
      ),
      ];
    },
    [draftBundle.workspaces, globalSearchStudentNames, studentDatabase.groups, unlockedGroupIds],
  );
  const emptyGroupExam = useMemo(() => normalizeExamStructure(createEmptyExam()), []);
  const hasNoAssignedWorkspaceForActiveGroup = Boolean(activeGroupId) && visibleWorkspaces.length === 0;
  const activeGroup = getStudentGroup(studentDatabase, activeGroupId);
  const preferredWorkspaceForActiveGroup = useMemo(
    () => pickPreferredWorkspaceForGroup(visibleWorkspaces, activeGroup, studentDatabase),
    [activeGroup, studentDatabase, visibleWorkspaces],
  );
  const activeWorkspace =
    visibleWorkspaces.find((workspace) => workspace.id === draftBundle.activeWorkspaceId) ??
    preferredWorkspaceForActiveGroup ??
    visibleWorkspaces[0] ??
    null;
  const {
    setArchiveEntryId: setActiveWorkspaceArchiveEntryId,
    setAssignedGroupId: setActiveWorkspaceGroupId,
  } = useWorkspaceContextController({
    activeWorkspaceId: activeWorkspace?.id ?? null,
    setDraftBundle,
  });
  const exam = activeWorkspace?.exam ?? emptyGroupExam;
  const activeArchiveEntryId = activeWorkspace?.activeArchiveEntryId ?? null;
  const activeStudentRecord = getStudentRecord(studentDatabase, activeStudentId);
  const activeAssessment = activeStudentId
    ? getStudentAssessment(studentDatabase, activeStudentId, activeWorkspace?.id ?? null)
    : null;
  const activeSignatureDataUrl = getEffectiveSignatureDataUrl(activeGroup, activeAssessment);
  const activeGroupPassword = activeGroupId ? unlockedGroupPasswordsRef.current[activeGroupId] ?? "" : "";
  const assessmentLocked = Boolean(activeGroup?.passwordVerifier) && !activeGroupPassword;
  const activeGroupIsProtected = Boolean(activeGroup?.passwordVerifier);
  const activeUnlockButtonLabel = !activeGroup
    ? "Keine Klasse aktiv"
    : !activeGroupIsProtected
      ? "Aktive Klasse ohne Passwort"
      : assessmentLocked
        ? "Klasse entsperren"
        : "Klasse sperren";
  const [activeStudentLiveLabel, setActiveStudentLiveLabel] = useState<string | null>(null);
  const [activeStudentLiveLabelTitle, setActiveStudentLiveLabelTitle] = useState("Aktiver Schülercode");
  const backupStatus = useMemo(
    () => describeBackupStatus(studentDatabase, lastBackupAt, lastBackupFailure),
    [studentDatabase, lastBackupAt, lastBackupFailure],
  );
  const schoolYearBackupOptions = useMemo<SchoolYearBackupOption[]>(() => {
    const workspaceIdsWithAssessments = new Map<string, number>();
    Object.values(studentDatabase.assessments).forEach((assessment) => {
      const workspaceId = getAssessmentWorkspaceId(assessment);
      if (!workspaceId) return;
      workspaceIdsWithAssessments.set(workspaceId, (workspaceIdsWithAssessments.get(workspaceId) ?? 0) + 1);
    });

    const optionBySchoolYear = new Map<string, SchoolYearBackupOption>();
    draftBundle.workspaces.forEach((workspace) => {
      const schoolYear = getWorkspaceSchoolYear(workspace);
      const current = optionBySchoolYear.get(schoolYear) ?? {
        value: schoolYear,
        label: getSchoolYearLabel(schoolYear),
        workspaceCount: 0,
        snapshotCount: 0,
        assessmentCount: 0,
      };
      optionBySchoolYear.set(schoolYear, {
        ...current,
        workspaceCount: current.workspaceCount + 1,
        snapshotCount: current.snapshotCount + workspace.versions.length,
        assessmentCount: current.assessmentCount + (workspaceIdsWithAssessments.get(workspace.id) ?? 0),
      });
    });

    return Array.from(optionBySchoolYear.values()).sort((left, right) =>
      left.label.localeCompare(right.label, "de-DE", { numeric: true }),
    );
  }, [draftBundle.workspaces, studentDatabase.assessments]);
  const totalSnapshotCount = useMemo(
    () => draftBundle.workspaces.reduce((sum, workspace) => sum + workspace.versions.length, 0),
    [draftBundle.workspaces],
  );

  const captureRestoreCheckpoint = (): RestoreCheckpoint => ({
    draftBundle,
    archiveEntries,
    studentDatabase,
    activeGroupId,
    activeStudentId,
    lastBackupAt,
    lastBackupFailure,
  });

  const resetDemoWorkspace = () => {
    void (async () => {
      const nextDraftBundle = createDemoDraftBundle();
      const nextArchiveEntries: ExpectationArchiveEntry[] = [];
      const nextStudentDatabase = await createDemoStudentDatabase(nextDraftBundle.workspaces);

      setDraftBundle(nextDraftBundle);
      setArchiveEntries(nextArchiveEntries);
      trackLocalSave(saveExpectationArchive(nextArchiveEntries));
      markDemoSeedCurrent();
      setStudentDatabase(nextStudentDatabase);
      setActiveGroupId(nextStudentDatabase.groups[0]?.id ?? "");
      setActiveStudentId(nextStudentDatabase.groups[0]?.students[0]?.id ?? "");
      clearSensitiveGlobalSearch();
      unlockedGroupPasswordsRef.current = {};
      setUnlockedGroupIds([]);
      setRestoreCheckpoint(null);
      setPendingImportPreview(null);
      setLastBackupAt(null);
      setLastBackupFailure(null);
      clearBackupComplete();
      clearBackupFailure();
      setActiveTab("home");
      pushNotice("info", "Demo-Daten wurden neu geladen.", "Der Beispieldatensatz wurde lokal zurückgesetzt.");
    })();
  };

  const applyImportedState = (
    nextDraftBundle: DraftBundle,
    nextArchiveEntries: ExpectationArchiveEntry[],
    nextStudentDatabase: StudentDatabase,
    nextLastBackupAt: string | null,
  ) => {
    setRestoreCheckpoint(captureRestoreCheckpoint());
    setDraftBundle(nextDraftBundle);
    setArchiveEntries(nextArchiveEntries);
    trackLocalSave(saveExpectationArchive(nextArchiveEntries));
    setStudentDatabase(nextStudentDatabase);
    clearSensitiveGlobalSearch();
    unlockedGroupPasswordsRef.current = {};
    setUnlockedGroupIds([]);

    const importedActiveWorkspace =
      nextDraftBundle.workspaces.find((workspace) => workspace.id === nextDraftBundle.activeWorkspaceId) ??
      nextDraftBundle.workspaces[0] ??
      null;
    const preferredGroupId =
      importedActiveWorkspace?.assignedGroupId ?? nextStudentDatabase.groups[0]?.id ?? "";
    const preferredGroup =
      nextStudentDatabase.groups.find((group) => group.id === preferredGroupId) ??
      nextStudentDatabase.groups[0] ??
      null;

    setActiveGroupId(preferredGroup?.id ?? "");
    setActiveStudentId(preferredGroup?.students[0]?.id ?? "");
    setActiveSchoolYearFilter("all");

    if (nextLastBackupAt) {
      markBackupComplete(nextLastBackupAt);
      setLastBackupFailure(null);
    } else {
      clearBackupComplete();
    }
    setLastBackupAt(nextLastBackupAt);
  };

  const rollbackLastImport = () => {
    if (!restoreCheckpoint) return;

    setDraftBundle(restoreCheckpoint.draftBundle);
    setArchiveEntries(restoreCheckpoint.archiveEntries);
    trackLocalSave(saveExpectationArchive(restoreCheckpoint.archiveEntries));
    setStudentDatabase(restoreCheckpoint.studentDatabase);
    clearSensitiveGlobalSearch();
    unlockedGroupPasswordsRef.current = {};
    setUnlockedGroupIds([]);
    setActiveGroupId(restoreCheckpoint.activeGroupId);
    setActiveStudentId(restoreCheckpoint.activeStudentId);
    setActiveSchoolYearFilter("all");
    if (restoreCheckpoint.lastBackupAt) {
      markBackupComplete(restoreCheckpoint.lastBackupAt);
    } else {
      clearBackupComplete();
    }
    setLastBackupAt(restoreCheckpoint.lastBackupAt);
    if (restoreCheckpoint.lastBackupFailure) {
      markBackupFailed(restoreCheckpoint.lastBackupFailure.code, restoreCheckpoint.lastBackupFailure.occurredAt);
    } else {
      clearBackupFailure();
    }
    setLastBackupFailure(restoreCheckpoint.lastBackupFailure);
    setRestoreCheckpoint(null);
    pushNotice("success", "Import rückgängig gemacht", "Der vorherige lokale Arbeitsstand wurde wiederhergestellt.");
  };

  useEffect(() => {
    let cancelled = false;

    const updateActiveStudentLiveLabel = async () => {
      if (!activeStudentRecord) {
        if (!cancelled) {
          setActiveStudentLiveLabel(null);
          setActiveStudentLiveLabelTitle("Aktiver Schülercode");
        }
        return;
      }

      if (!activeGroup?.passwordVerifier) {
        if (!cancelled) {
          setActiveStudentLiveLabel(activeStudentRecord.alias);
          setActiveStudentLiveLabelTitle("Aktiver Schülercode");
        }
        return;
      }

      const unlockedPassword = await getUsableUnlockedGroupPassword(activeGroup.id);
      if (!unlockedPassword) {
        if (!cancelled) {
          setActiveStudentLiveLabel(activeStudentRecord.alias);
          setActiveStudentLiveLabelTitle("Aktiver Schülercode");
        }
        return;
      }

      try {
        const fullName = await decryptText(activeStudentRecord.encryptedName, unlockedPassword);
        if (!cancelled) {
          setActiveStudentLiveLabel(fullName);
          setActiveStudentLiveLabelTitle("Aktiver Schülername");
        }
      } catch {
        if (!cancelled) {
          setActiveStudentLiveLabel(activeStudentRecord.alias);
          setActiveStudentLiveLabelTitle("Aktiver Schülercode");
        }
      }
    };

    void updateActiveStudentLiveLabel();

    return () => {
      cancelled = true;
    };
  }, [activeGroup, activeStudentRecord, unlockedGroupIds]);

  useEffect(() => {
    if (!activeGroupId || visibleWorkspaces.length === 0) return;
    if (activeWorkspace && workspaceMatchesGroup(activeWorkspace, activeGroupId)) return;

    setDraftBundle((current) => ({
      ...current,
      activeWorkspaceId: (pickPreferredWorkspaceForGroup(visibleWorkspaces, activeGroup, studentDatabase) ?? visibleWorkspaces[0])!.id,
    }));
    setCollapsedSectionIds([]);
  }, [activeGroup, activeGroupId, activeWorkspace, studentDatabase, visibleWorkspaces]);

  useEffect(() => {
    const previousGroupId = previousActiveGroupIdRef.current;
    previousActiveGroupIdRef.current = activeGroupId;

    if (!activeGroupId || previousGroupId === activeGroupId) return;
    if (!preferredWorkspaceForActiveGroup) return;
    if (draftBundle.activeWorkspaceId === preferredWorkspaceForActiveGroup.id) return;

    setDraftBundle((current) => ({
      ...current,
      activeWorkspaceId: preferredWorkspaceForActiveGroup.id,
    }));
    setCollapsedSectionIds([]);
  }, [activeGroupId, draftBundle.activeWorkspaceId, preferredWorkspaceForActiveGroup]);

  const displayExam = useMemo(
    () => (storageReady ? buildExamForStudent(exam, studentDatabase, selectedStudent, activeWorkspace?.id ?? null) : exam),
    [activeWorkspace?.id, exam, storageReady, studentDatabase, selectedStudent],
  );
  const summary = useMemo(
    () => (storageReady ? calculateExamSummary(displayExam) : calculateExamSummary(exam)),
    [displayExam, exam, storageReady],
  );
  const classOverview = useMemo<ClassOverviewData | null>(() => {
    if (!storageReady) return null;
    if (!activeGroup) return null;

    const presentStudents = activeGroup.students.filter((student) => !student.isAbsent);
    if (presentStudents.length === 0) return null;

    const studentReports = presentStudents.map((student) => {
      const studentExam = buildExamForStudent(exam, studentDatabase, {
          groupId: activeGroup.id,
          studentId: student.id,
        }, activeWorkspace?.id ?? null);

      return {
        studentId: student.id,
        exam: studentExam,
        summary: calculateExamSummary(studentExam),
      };
    });

    const studentCount = studentReports.length;
    const percentageValues = studentReports.map((entry) => entry.summary.finalPercentage);
    const averagePercentage =
      percentageValues.reduce((sum, value) => sum + value, 0) / studentCount;
    const medianPercentage = getMedian(percentageValues);
    const bestPercentage = Math.max(...percentageValues);
    const lowestPercentage = Math.min(...percentageValues);
    const numericGrades = studentReports.reduce<number[]>((values, entry) => {
      const numericGrade = gradeLabelToNumericValue(entry.summary.grade.label);
      if (numericGrade !== null) {
        values.push(numericGrade);
      }
      return values;
    }, []);
    const averageGrade =
      numericGrades.length > 0
        ? numericGrades.reduce((sum, value) => sum + value, 0) / numericGrades.length
        : 0;

    const gradeCounts = studentReports.reduce((map, entry) => {
      map.set(entry.summary.grade.label, (map.get(entry.summary.grade.label) ?? 0) + 1);
      return map;
    }, new Map<string, number>());

    const gradeDistribution = [...getEffectiveGradeBands(exam.gradeScale, summary.totalMaxPoints)]
      .sort((a, b) => b.lowerBound - a.lowerBound)
      .map((band) => ({
        label: band.label,
        display:
          exam.gradeScale.schoolMode === "numeric"
            ? band.label
            : `${band.label} · ${band.verbalLabel}`,
        count: gradeCounts.get(band.label) ?? 0,
        color: band.color,
      }))
      .filter((entry) => entry.count > 0);

    const sectionDistribution = exam.sections.map((section, index) => {
      const totals = studentReports.reduce(
        (accumulator, entry) => {
          const result = entry.summary.sectionResults.find((item) => item.sectionId === section.id);
          return {
            achievedPoints: accumulator.achievedPoints + (result?.achievedPoints ?? 0),
            maxPoints: accumulator.maxPoints + (result?.maxPoints ?? 0),
          };
        },
        { achievedPoints: 0, maxPoints: 0 },
      );

      return {
        sectionId: section.id,
        title: section.title,
        achievedPoints: totals.achievedPoints / studentCount,
        maxPoints: totals.maxPoints / studentCount,
        percentage: totals.maxPoints > 0 ? (totals.achievedPoints / totals.maxPoints) * 100 : 0,
        color: SECTION_CHART_PALETTE[index % SECTION_CHART_PALETTE.length],
      };
    });

    const taskDistribution = exam.sections.flatMap((section) =>
      section.tasks.map((task) => {
        const totals = studentReports.reduce(
          (accumulator, report) => {
            const studentTask = report.exam.sections
              .find((entrySection) => entrySection.id === section.id)
              ?.tasks.find((entryTask) => entryTask.id === task.id);

            return {
              achievedPoints: accumulator.achievedPoints + (studentTask?.achievedPoints ?? 0),
              maxPoints: accumulator.maxPoints + (studentTask?.maxPoints ?? 0),
            };
          },
          { achievedPoints: 0, maxPoints: 0 },
        );

        return {
          taskId: task.id,
          sectionId: section.id,
          sectionTitle: section.title,
          taskTitle: task.title,
          achievedPoints: totals.achievedPoints / studentCount,
          maxPoints: totals.maxPoints / studentCount,
          percentage: totals.maxPoints > 0 ? (totals.achievedPoints / totals.maxPoints) * 100 : 0,
        };
      }),
    );

    return {
      studentCount,
      averagePercentage,
      medianPercentage,
      bestPercentage,
      lowestPercentage,
      averageGrade,
      gradeDistribution,
      sectionDistribution,
      taskDistribution,
    };
  }, [activeGroup, activeWorkspace?.id, exam, storageReady, studentDatabase]);
  const hasPointWeightMismatch = useMemo(
    () => (storageReady ? hasSectionPointWeightMismatch(exam) : false),
    [exam, storageReady],
  );
  const correctionCompletionState = useMemo(() => {
    if (!activeGroup || !activeWorkspace) {
      return {
        key: null,
        allCorrected: false,
        correctedCount: 0,
        relevantStudentCount: 0,
        inProgressCount: 0,
        uncorrectedCount: 0,
        absentCount: 0,
      };
    }

    const absentCount = activeGroup.students.filter((student) => student.isAbsent).length;
    const relevantStudents = activeGroup.students.filter((student) => !student.isAbsent);
    if (relevantStudents.length === 0) {
      return {
        key: `${activeGroup.id}::${activeWorkspace.id}`,
        allCorrected: false,
        correctedCount: 0,
        relevantStudentCount: 0,
        inProgressCount: 0,
        uncorrectedCount: 0,
        absentCount,
      };
    }

    const statusCounts = relevantStudents.reduce((counts, student) => {
      const correctionStatus = getStudentCorrectionStatus(
        exam,
        getStudentAssessment(studentDatabase, student.id, activeWorkspace.id),
      );
      if (correctionStatus === "corrected") counts.correctedCount += 1;
      if (correctionStatus === "inProgress") counts.inProgressCount += 1;
      if (correctionStatus === "uncorrected") counts.uncorrectedCount += 1;
      return counts;
    }, { correctedCount: 0, inProgressCount: 0, uncorrectedCount: 0 });

    return {
      key: `${activeGroup.id}::${activeWorkspace.id}`,
      allCorrected: statusCounts.correctedCount === relevantStudents.length,
      correctedCount: statusCounts.correctedCount,
      relevantStudentCount: relevantStudents.length,
      inProgressCount: statusCounts.inProgressCount,
      uncorrectedCount: statusCounts.uncorrectedCount,
      absentCount,
    };
  }, [activeGroup, activeWorkspace, exam, studentDatabase]);
  const sectionPointTargets = useMemo(
    () => (storageReady ? getNormalizedSectionPointTargets(exam) : new Map()),
    [exam, storageReady],
  );

  useEffect(() => {
    const completionKey = correctionCompletionState.key;
    if (!completionKey) return;

    if (!correctionCompletionState.allCorrected) {
      completedCorrectionCelebrationKeysRef.current[completionKey] = false;
      return;
    }

    if (completedCorrectionCelebrationKeysRef.current[completionKey]) return;

    completedCorrectionCelebrationKeysRef.current[completionKey] = true;
    triggerExamCelebration();
  }, [correctionCompletionState]);

  useEffect(() => {
    if (!storageReady || !activeWorkspace) return;

    const workspaceId = activeWorkspace.id;
    const currentSerialized = JSON.stringify(activeWorkspace.exam);
    const lastVersioned = lastVersionedExamByWorkspaceRef.current[workspaceId];

    if (lastVersioned === undefined) {
      lastVersionedExamByWorkspaceRef.current[workspaceId] = currentSerialized;
      return;
    }

    if (lastVersioned === currentSerialized) return;

    const timeoutId = window.setTimeout(() => {
      setDraftBundle((current) => {
        const workspace = current.workspaces.find((entry) => entry.id === workspaceId) ?? null;
        if (!workspace) return current;

        const latestSerialized = JSON.stringify(workspace.exam);
        const baselineSerialized = lastVersionedExamByWorkspaceRef.current[workspaceId];
        if (!baselineSerialized || baselineSerialized === latestSerialized) return current;

        lastVersionedExamByWorkspaceRef.current[workspaceId] = latestSerialized;

        const nextVersion: DraftWorkspaceVersion = {
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          exam: cloneExamSnapshot(JSON.parse(baselineSerialized) as Exam),
        };

        return {
          ...current,
          workspaces: current.workspaces.map((entry) =>
            entry.id !== workspaceId
              ? entry
              : {
                  ...entry,
                  versions: [nextVersion, ...entry.versions].slice(0, MAX_WORKSPACE_VERSIONS),
                },
          ),
        };
      });
    }, WORKSPACE_VERSION_INTERVAL_MS);

    return () => window.clearTimeout(timeoutId);
  }, [activeWorkspace, storageReady]);

  const openStudentInBuilder = (studentId: string, options?: { groupId?: string; workspaceId?: string }) => {
    if (options?.groupId !== undefined) {
      setActiveGroupId(options.groupId);
    }
    if (options?.workspaceId) {
      setActiveWorkspaceId(options.workspaceId);
    }
    setActiveStudentId(studentId);
    setActiveTab("builder");
  };

  const openGlobalSearchResult = (resultId: string) => {
    if (resultId.startsWith("workspace:")) {
      const workspaceId = resultId.slice("workspace:".length);
      const workspace = draftBundle.workspaces.find((entry) => entry.id === workspaceId);
      if (!workspace) return;

      if (workspace.assignedGroupId) setActiveGroupId(workspace.assignedGroupId);
      setActiveSchoolYearFilter(getWorkspaceSchoolYear(workspace) || "all");
      setActiveWorkspaceId(workspace.id);
      setActiveTab("builder");
      return;
    }

    if (!resultId.startsWith("student:")) return;
    const studentId = resultId.slice("student:".length);
    const group = studentDatabase.groups.find((entry) => entry.students.some((student) => student.id === studentId));
    if (!group) return;

    const latestWorkspace = draftBundle.workspaces
      .filter((workspace) => workspace.assignedGroupId === group.id)
      .sort((left, right) => {
        const leftDate = left.exam.meta.examDate || left.updatedAt;
        const rightDate = right.exam.meta.examDate || right.updatedAt;
        return rightDate.localeCompare(leftDate);
      })[0];
    if (latestWorkspace) {
      setActiveSchoolYearFilter(getWorkspaceSchoolYear(latestWorkspace) || "all");
    }
    openStudentInBuilder(studentId, { groupId: group.id, workspaceId: latestWorkspace?.id });
  };

  const setActiveWorkspaceExam = (updater: Exam | ((current: Exam) => Exam)) => {
    const activeWorkspaceId = activeWorkspace?.id;
    if (!activeWorkspaceId) return;

    setDraftBundle((current) => ({
      ...current,
      workspaces: current.workspaces.map((workspace) => {
        if (workspace.id !== activeWorkspaceId) return workspace;
        const nextExam = typeof updater === "function" ? (updater as (current: Exam) => Exam)(workspace.exam) : updater;
        return { ...workspace, exam: nextExam, updatedAt: new Date().toISOString() };
      }),
    }));
  };

  const triggerExamCelebration = () => {
    pushNotice("success", "Korrektur abgeschlossen", "Alle ausgewählten Bewertungsbögen sind als korrigiert markiert.");
  };

  const updateExam = (patch: Partial<Exam>) =>
    setActiveWorkspaceExam((current) => normalizeExamStructure({ ...current, ...patch }));

  const commitBuiltExam = (
    nextExam: Exam,
    config: {
      target: GuidedBuilderTarget;
      targetGroupId: string | null;
      currentTitle: string;
      currentDetail: string;
      newTitle: string;
      newDetail: string;
    },
  ) => {
    const normalizedExam = normalizeExamStructure(nextExam);
    const assignedGroupId =
      config.target === "new"
        ? config.targetGroupId || activeGroupId || null
        : activeGroupId || null;

    if (config.target === "current") {
      const activeWorkspaceId = activeWorkspace?.id;
      if (!activeWorkspaceId) return;

      const nextBundle = {
        ...draftBundle,
        workspaces: draftBundle.workspaces.map((workspace) =>
          workspace.id === activeWorkspaceId
            ? {
                ...workspace,
                exam: normalizedExam,
                activeArchiveEntryId: null,
                assignedGroupId,
                updatedAt: new Date().toISOString(),
              }
            : workspace,
        ),
      };
      setDraftBundle(nextBundle);
      trackLocalSave(saveDraft(nextBundle));
      lastVersionedExamByWorkspaceRef.current = {
        ...lastVersionedExamByWorkspaceRef.current,
        [activeWorkspaceId]: JSON.stringify(normalizedExam),
      };
    } else {
      const workspaceId = crypto.randomUUID();
      const workspace = {
        ...createDraftWorkspace(
          normalizedExam,
          getNextWorkspaceLabel(draftBundle.workspaces),
          null,
          assignedGroupId,
        ),
        id: workspaceId,
      };
      const nextBundle = {
        activeWorkspaceId: workspace.id,
        workspaces: [...draftBundle.workspaces, workspace],
      };
      setDraftBundle(nextBundle);
      trackLocalSave(saveDraft(nextBundle));
      lastVersionedExamByWorkspaceRef.current = {
        ...lastVersionedExamByWorkspaceRef.current,
        [workspaceId]: JSON.stringify(normalizedExam),
      };
      syncBuilderToGroup(assignedGroupId);
    }

    setCollapsedSectionIds([]);
    setActiveTab("builder");
    setPendingSchoolYearCreation(null);
    const assignedGroup =
      config.target === "new"
        ? getStudentGroup(studentDatabaseRef.current, config.targetGroupId || activeGroupId || "")
        : null;
    pushNotice(
      "success",
      config.target === "current" ? config.currentTitle : config.newTitle,
      config.target === "current"
        ? `${config.currentDetail} Der EWH wurde gespeichert und im Editor geöffnet.`
        : assignedGroup
          ? `${config.newDetail.replace("{group}", `${assignedGroup.subject} · ${assignedGroup.className}`)} Der EWH wurde gespeichert und im Editor geöffnet.`
          : `${config.newDetail.replace(" für {group}", "")} Der EWH wurde gespeichert und im Editor geöffnet.`,
    );
  };

  const applyImportedExamSuggestion = (config: {
    suggestion: ImportedExamSuggestion;
    target: GuidedBuilderTarget;
    gradeScale: Exam["gradeScale"];
    meta: Exam["meta"];
    targetGroupId: string | null;
  }) => {
    const { suggestion } = config;
    const baseExam = createEmptyExam();
    const nextExam = normalizeExamStructure({
      ...baseExam,
      meta: {
        ...config.meta,
        schoolYear: suggestion.meta.schoolYear.trim() || config.meta.schoolYear,
        gradeLevel: suggestion.meta.gradeLevel.trim() || config.meta.gradeLevel,
        course: suggestion.meta.course.trim() || config.meta.course,
        teacher: config.meta.teacher,
        examDate: suggestion.meta.examDate.trim() || config.meta.examDate,
        title: suggestion.meta.title.trim() || config.meta.title,
        unit: suggestion.meta.unit.trim() || config.meta.unit,
        notes: [config.meta.notes.trim(), suggestion.meta.notes.trim()].filter(Boolean).join("\n\n"),
      },
      evaluationMode: "direct",
      gradeScale: config.gradeScale,
      printSettings: exam.printSettings,
      sections:
        suggestion.sections.length > 0
          ? suggestion.sections.map((section, index) => createImportedSection(section, index))
          : baseExam.sections,
    });

    commitBuiltExam(nextExam, {
      target: config.target,
      targetGroupId: config.targetGroupId,
      currentTitle: "PDF-Vorschlag übernommen",
      currentDetail: `${suggestion.sections.length} Abschnitt(e) und erkannte Metadaten wurden in den aktiven EWH übernommen.`,
      newTitle: "PDF-Vorschlag als Klassenarbeit angelegt",
      newDetail: "Der PDF-Vorschlag wurde als neue Klassenarbeit für {group} angelegt.",
    });
  };

  const updateSection = (sectionId: string, patch: Partial<Section>) => {
    setActiveWorkspaceExam((current) =>
      normalizeExamStructure({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId ? normalizeWritingSection({ ...section, ...patch }) : section,
        ),
      }),
    );
  };

  const updateTask = (sectionId: string, taskId: string, patch: Partial<Task>) => {
    if (selectedStudent && patch.achievedPoints !== undefined) {
      setStudentDatabase((current) =>
        updateStudentScore(current, activeWorkspace?.id ?? null, selectedStudent.studentId, taskId, Number(patch.achievedPoints)),
      );
    }

    const templatePatch = { ...patch };
    delete templatePatch.achievedPoints;
    if (Object.keys(templatePatch).length === 0) return;

    if (templatePatch.maxPoints !== undefined) {
      const section = exam.sections.find((entry) => entry.id === sectionId) ?? null;
      const task = section?.tasks.find((entry) => entry.id === taskId) ?? null;
      const targetMaxPoints = Number(templatePatch.maxPoints);

      if (
        task &&
        Number.isFinite(targetMaxPoints) &&
        Math.abs(task.maxPoints - targetMaxPoints) > 0.0001
      ) {
        const targetGroupId = activeWorkspace?.assignedGroupId ?? activeGroupId;
        const targetGroup = getStudentGroup(studentDatabase, targetGroupId);
        const affectedStudentCount = (targetGroup?.students ?? []).reduce((count, student) => {
          const assessment = getStudentAssessment(studentDatabase, student.id, activeWorkspace?.id ?? null);
          return count + (assessment && Object.prototype.hasOwnProperty.call(assessment.taskScores, taskId) ? 1 : 0);
        }, 0);

        if (targetGroup && affectedStudentCount > 0) {
          setScalePendingTaskScores(false);
          setPendingTaskMaxPointsChange({
            sectionId,
            taskId,
            taskTitle: task.title.trim() || "Unbenannte Aufgabe",
            currentMaxPoints: task.maxPoints,
            targetMaxPoints,
            groupId: targetGroup.id,
            groupLabel: `${targetGroup.subject} · ${targetGroup.className}`,
            affectedStudentCount,
          });
          return;
        }
      }
    }

    setActiveWorkspaceExam((current) =>
      normalizeExamStructure({
        ...current,
        sections: current.sections.map((section) =>
          section.id !== sectionId
            ? section
            : normalizeWritingSection({
                ...section,
                tasks: section.tasks.map((task) => (task.id === taskId ? { ...task, ...templatePatch } : task)),
              }),
        ),
      }),
    );
  };

  const applyPendingTaskMaxPointsChange = (scaleStudentScores: boolean) => {
    if (!pendingTaskMaxPointsChange) return;

    const {
      sectionId,
      taskId,
      currentMaxPoints,
      targetMaxPoints,
      groupId,
    } = pendingTaskMaxPointsChange;

    setActiveWorkspaceExam((current) =>
      normalizeExamStructure({
        ...current,
        sections: current.sections.map((section) =>
          section.id !== sectionId
            ? section
            : normalizeWritingSection({
                ...section,
                tasks: section.tasks.map((task) =>
                  task.id === taskId ? { ...task, maxPoints: targetMaxPoints } : task,
                ),
              }),
        ),
      }),
    );

    if (scaleStudentScores) {
      const targetGroup = getStudentGroup(studentDatabaseRef.current, groupId);
      const studentIds = targetGroup?.students.map((student) => student.id) ?? [];

      if (studentIds.length > 0) {
        setStudentDatabase((current) =>
          scaleTaskScoresForStudents(current, studentIds, activeWorkspace?.id ?? null, taskId, currentMaxPoints, targetMaxPoints),
        );
      }
    }

    setPendingTaskMaxPointsChange(null);
    setScalePendingTaskScores(false);
  };

  const scaleSectionTotal = (sectionId: string, targetTotal: number) => {
    setActiveWorkspaceExam((current) =>
      normalizeExamStructure({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId ? scaleSectionTasksToTotal(section, targetTotal) : section,
        ),
      }),
    );
  };

  const requestSectionTotalChange = (sectionId: string, targetTotal: number) => {
    const section = exam.sections.find((entry) => entry.id === sectionId) ?? null;
    if (!section) return;

    const currentTotal = section.tasks.reduce((sum, task) => sum + task.maxPoints, 0);
    if (Math.abs(currentTotal - targetTotal) < 0.0001) return;

    setPendingSectionTotalChange({
      sectionId,
      sectionTitle: section.title.trim() || "Unbenannter Abschnitt",
      currentTotal,
      targetTotal,
    });
  };

  const rebalanceSectionWeight = (sectionId: string, targetWeight: number) => {
    updateSection(sectionId, { weight: targetWeight });
  };

  const duplicateSection = (sectionId: string) => {
    setActiveWorkspaceExam((current) => {
      const index = current.sections.findIndex((section) => section.id === sectionId);
      if (index === -1) return current;
      const source = current.sections[index];
      const clone: Section = {
        ...source,
        id: crypto.randomUUID(),
        title: `${source.title} Kopie`,
        linkedSectionId: null,
        tasks: source.tasks.map((task) => ({ ...task, id: crypto.randomUUID(), achievedPoints: 0 })),
      };
      const sections = [...current.sections];
      sections.splice(index + 1, 0, clone);
      return normalizeExamStructure({ ...current, sections });
    });
  };

  const duplicateTask = (sectionId: string, taskId: string) => {
    setActiveWorkspaceExam((current) =>
      normalizeExamStructure({
        ...current,
        sections: current.sections.map((section) => {
          if (section.id !== sectionId) return section;
          const index = section.tasks.findIndex((task) => task.id === taskId);
          if (index === -1) return section;
          const source = section.tasks[index];
          const clone = { ...source, id: crypto.randomUUID(), title: `${source.title} Kopie`, achievedPoints: 0 };
          const tasks = [...section.tasks];
          tasks.splice(index + 1, 0, clone);
          return { ...section, tasks };
        }),
      }),
    );
  };

  const deleteSectionNow = (sectionId: string) => {
    setActiveWorkspaceExam((current) =>
      normalizeExamStructure({
        ...current,
        sections: current.sections.filter((entry) => entry.id !== sectionId),
      }),
    );
  };

  const toggleSectionLink = (sectionId: string) => {
    setActiveWorkspaceExam((current) => {
      const index = current.sections.findIndex((section) => section.id === sectionId);
      if (index === -1) return current;

      const sections = current.sections.map((section) => ({ ...section }));
      const currentSection = sections[index]!;
      const partnerIndex = getLinkedSectionPartnerIndex(sections, index);

      if (partnerIndex !== -1) {
        sections[index] = { ...currentSection, linkedSectionId: null };
        sections[partnerIndex] = { ...sections[partnerIndex]!, linkedSectionId: null };
        return normalizeExamStructure({ ...current, sections });
      }

      const nextSection = sections[index + 1];
      const previousSection = sections[index - 1];
      const partner =
        nextSection && !nextSection.linkedSectionId
          ? nextSection
          : previousSection && !previousSection.linkedSectionId
            ? previousSection
            : null;

      if (!partner) return current;

      sections[index] = { ...currentSection, linkedSectionId: partner.id };
      const partnerIndexById = sections.findIndex((section) => section.id === partner.id);
      sections[partnerIndexById] = {
        ...sections[partnerIndexById]!,
        linkedSectionId: currentSection.id,
      };
      return normalizeExamStructure({ ...current, sections });
    });
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setActiveWorkspaceExam((current) => {
      const bounds = getSectionBlockBounds(current.sections, sectionId);
      if (!bounds) return current;

      if (direction === "up" && bounds.startIndex === 0) return current;
      if (direction === "down" && bounds.endIndex >= current.sections.length - 1) return current;

      const sections =
        direction === "up"
          ? moveBlock(current.sections, bounds.startIndex, bounds.endIndex, bounds.startIndex - 1)
          : moveBlock(current.sections, bounds.startIndex, bounds.endIndex, bounds.endIndex + 2);

      return normalizeExamStructure({ ...current, sections });
    });
  };

  const handleDragOverSection = (targetSectionId: string, position: "before" | "after") => {
    if (!draggedSectionId || draggedSectionId === targetSectionId) {
      setSectionDropIndicator(null);
      return;
    }

    setSectionDropIndicator((current) =>
      current?.targetSectionId === targetSectionId && current.position === position
        ? current
        : { targetSectionId, position },
    );
  };

  const handleDropSection = (targetSectionId: string, position: "before" | "after") => {
    if (!draggedSectionId || draggedSectionId === targetSectionId) return;
    setActiveWorkspaceExam((current) => {
      const draggedBounds = getSectionBlockBounds(current.sections, draggedSectionId);
      const targetIndex = current.sections.findIndex((section) => section.id === targetSectionId);
      if (!draggedBounds || targetIndex === -1) return current;
      if (targetIndex >= draggedBounds.startIndex && targetIndex <= draggedBounds.endIndex) return current;

      return normalizeExamStructure({
        ...current,
        sections: moveBlock(
          current.sections,
          draggedBounds.startIndex,
          draggedBounds.endIndex,
          position === "before" ? targetIndex : targetIndex + 1,
        ),
      });
    });
    setDraggedSectionId(null);
    setSectionDropIndicator(null);
  };

  const syncBuilderToGroup = (groupId: string | null) => {
    if (!groupId) return null;

    const targetGroup = getStudentGroup(studentDatabaseRef.current, groupId);
    if (!targetGroup) return null;

    setActiveGroupId(targetGroup.id);
    setActiveStudentId(targetGroup.students[0]?.id ?? "");
    return targetGroup;
  };

  const applyTemplate = (
    template: ExamTemplateDefinition,
    target: GuidedBuilderTarget,
    gradeScale: Exam["gradeScale"],
    meta: Exam["meta"],
    targetGroupId: string | null,
    targetTotalPoints: number = template.totalPoints,
  ) => {
    const templateExam = normalizeExamStructure(
      withExamMeta(
        {
          ...template.build(),
          gradeScale,
        },
        meta,
      ),
    );
    const nextExam = normalizeExamStructure(scaleExamPoints(templateExam, targetTotalPoints, false));
    commitBuiltExam(nextExam, {
      target,
      targetGroupId,
      currentTitle: "Vorlage übernommen",
      currentDetail: "Die aktuelle Klassenarbeit wurde mit der gewählten Vorlage vollständig aufgebaut.",
      newTitle: "Klassenarbeit erstellt",
      newDetail: "Die gewählte Vorlage wurde als neue Klassenarbeit für {group} angelegt.",
    });
    setTemplateToLoad(null);
  };

  const applyGuidedBuilderStructure = (config: {
    totalPoints: number;
    gradeScale: Exam["gradeScale"];
    sections: GuidedSectionDraft[];
    target: GuidedBuilderTarget;
    meta: Exam["meta"];
    targetGroupId: string | null;
  }) => {
    const nextExam = {
      ...exam,
      meta: { ...config.meta },
      evaluationMode: "direct" as const,
      gradeScale: config.gradeScale,
      sections: config.sections.map((section) => ({
        id: crypto.randomUUID(),
        title: section.title.trim(),
        description: section.description.trim(),
        weight: section.weight,
        linkedSectionId: null,
        maxPointsOverride: null,
        note: "",
        tasks: [
          {
            id: crypto.randomUUID(),
            title: `${section.title.trim()} · Aufgabe 1`,
            description: section.description.trim() || `Grundstruktur für ${section.title.trim()}`,
            category: section.title.trim(),
            maxPoints: Math.round(((config.totalPoints * section.weight) / 100) * 100) / 100,
            achievedPoints: 0,
            expectation: "",
          },
        ],
      })),
    };
    commitBuiltExam(nextExam, {
      target: config.target,
      targetGroupId: config.targetGroupId,
      currentTitle: "Klassenarbeit aufgebaut",
      currentDetail: "Die aktuelle Klassenarbeit wurde mit dem geführten Aufbau ersetzt.",
      newTitle: "Neue Klassenarbeit erstellt",
      newDetail: "Der geführte Aufbau wurde als neue Klassenarbeit für {group} angelegt.",
    });
  };

  const openArchiveEntryInBuilder = (entry: ExpectationArchiveEntry) => {
    setActiveWorkspaceExam(normalizeExamStructure(createEditableExamFromArchive(entry)));
    setCollapsedSectionIds([]);
    setActiveWorkspaceArchiveEntryId(entry.id);
    setActiveWorkspaceGroupId(activeGroupId || null);
    setActiveTab("builder");
  };

  const duplicateArchiveEntryToBuilder = (entry: ExpectationArchiveEntry) => {
    addWorkspace(createEditableExamFromArchive(entry, { duplicate: true }), {
      activeArchiveEntryId: null,
      assignedGroupId: activeGroupId || null,
    });
    setCollapsedSectionIds([]);
    setActiveTab("builder");
  };

  const assignArchiveEntryCopyToGroup = (entry: ExpectationArchiveEntry, groupId: string) => {
    const targetGroup = getStudentGroup(studentDatabase, groupId);
    if (!targetGroup) return;

    const workspace = createDraftWorkspace(
      normalizeExamStructure(createEditableExamFromArchive(entry, { duplicate: true })),
      getNextWorkspaceLabel(draftBundle.workspaces),
      entry.id,
      targetGroup.id,
    );
    const nextBundle = {
      activeWorkspaceId: workspace.id,
      workspaces: [...draftBundle.workspaces, workspace],
    };

    setDraftBundle(nextBundle);
    trackLocalSave(saveDraft(nextBundle));
    lastVersionedExamByWorkspaceRef.current = {
      ...lastVersionedExamByWorkspaceRef.current,
      [workspace.id]: JSON.stringify(workspace.exam),
    };
    setActiveGroupId(targetGroup.id);
    setActiveStudentId(targetGroup.students[0]?.id ?? "");
    setCollapsedSectionIds([]);
    setActiveTab("builder");
    pushNotice(
      "success",
      "Lerngruppe zugeordnet",
      `Die Vorlage wurde als neue Klassenarbeit für ${targetGroup.subject} · ${targetGroup.className} angelegt.`,
    );
  };

  const persistArchiveEntry = (incomingEntry: ExpectationArchiveEntry, overwriteId?: string) => {
    setArchiveEntries((current) => {
      const nextEntries = overwriteId
        ? current.map((entry) => (entry.id === overwriteId ? { ...incomingEntry, id: overwriteId } : entry))
        : [...current, incomingEntry];
      const merged = mergeArchiveEntries(nextEntries, []);
      trackLocalSave(saveExpectationArchive(merged));
      return merged;
    });
    setActiveWorkspaceArchiveEntryId(overwriteId ?? incomingEntry.id);
    setActiveTab("archive");
  };

  const saveExpectationsToArchive = () => {
    const incomingEntry = buildArchiveEntryFromExam(exam);
    const activeArchiveEntry = activeArchiveEntryId
      ? archiveEntries.find((entry) => entry.id === activeArchiveEntryId) ?? null
      : null;

    if (activeArchiveEntry) {
      setPendingArchiveOverwrite({ existing: activeArchiveEntry, incoming: incomingEntry });
      return;
    }

    const existingEntry = archiveEntries.find(
      (entry) => normalizeArchiveTitle(entry.examTitle) === normalizeArchiveTitle(incomingEntry.examTitle),
    );

    if (existingEntry) {
      setPendingArchiveOverwrite({ existing: existingEntry, incoming: incomingEntry });
      return;
    }

    persistArchiveEntry(incomingEntry);
  };

  const handleAddGroup = async (
    subject: string,
    className: string,
    access: { mode: GroupAccessMode; password?: string },
  ) => {
    const group = createStudentGroup(subject, className);
    const token = access.mode === "generated" ? generateSecurityToken() : access.password?.trim() ?? "";
    group.passwordVerifier = await createPasswordVerifier(group.id, token);
    setStudentDatabase((current) => addStudentGroup(current, group));
    unlockedGroupPasswordsRef.current = { ...unlockedGroupPasswordsRef.current, [group.id]: token };
    setUnlockedGroupIds((current) => (current.includes(group.id) ? current : [...current, group.id]));
    setActiveGroupId(group.id);
    setActiveStudentId("");
    if (access.mode === "generated") {
      setPendingSecurityTokenCards([
        {
          groupId: group.id,
          subject,
          className,
          token,
        },
      ]);
    }
  };

  const handleUnlockGroup = async (groupId: string, password: string, options?: { silent?: boolean }) => {
    const group = getStudentGroup(studentDatabase, groupId);
    if (!group?.passwordVerifier) {
      if (!options?.silent) {
        pushNotice("warning", "Kein Klassenpasswort vorhanden", "Für diese Klasse ist noch kein Passwort gesetzt.");
      }
      return false;
    }

    const isValidPassword = await verifyPassword(group.passwordVerifier, group.id, password);
    if (!isValidPassword) {
      if (!options?.silent) {
        pushNotice("danger", "Klassenpasswort falsch");
      }
      return false;
    }

    unlockActivityAtRef.current = Date.now();
    clearSensitiveGlobalSearch();
    unlockedGroupPasswordsRef.current = { ...unlockedGroupPasswordsRef.current, [groupId]: password };
    setUnlockedGroupIds((current) => (current.includes(groupId) ? current : [...current, groupId]));
    const hydratedDatabase = await hydrateSensitiveAssessmentsForGroup(studentDatabaseRef.current, groupId, password);
    setStudentDatabase(hydratedDatabase);
    return true;
  };

  const openHeaderUnlockDialog = () => {
    if (!activeGroup?.passwordVerifier) {
      pushNotice("warning", "Keine geschützte Klasse aktiv", "Wähle zuerst eine passwortgeschützte Lerngruppe aus.");
      return;
    }

    setHeaderUnlockDialogOpen(true);
    setHeaderUnlockPasswordInput("");
    setHeaderUnlockError("");
    setHeaderUnlockLoading(false);
  };

  const handleHeaderLockToggle = () => {
    if (!activeGroup?.id || !activeGroup.passwordVerifier) {
      pushNotice("warning", "Keine geschützte Klasse aktiv", "Wähle zuerst eine passwortgeschützte Lerngruppe aus.");
      return;
    }

    if (activeGroupPassword) {
      lockGroupSession(activeGroup.id);
      return;
    }

    openHeaderUnlockDialog();
  };

  const getUsableUnlockedGroupPassword = async (groupId: string) => {
    const group = getStudentGroup(studentDatabaseRef.current, groupId);
    if (!group?.passwordVerifier) return "";

    const password = unlockedGroupPasswordsRef.current[groupId]?.trim() ?? "";
    if (!password) return "";

    const isValidPassword = await verifyPassword(group.passwordVerifier, group.id, password);
    if (isValidPassword) return password;

    const nextPasswords = { ...unlockedGroupPasswordsRef.current };
    delete nextPasswords[groupId];
    clearSensitiveGlobalSearch();
    unlockedGroupPasswordsRef.current = nextPasswords;
    setUnlockedGroupIds((current) => current.filter((id) => id !== groupId));
    setStudentDatabase((current) => scrubSensitiveAssessmentsForGroups(current, [groupId]));
    return "";
  };

  const handleAddStudent = async (groupId: string, alias: string, fullName: string) => {
    const group = getStudentGroup(studentDatabase, groupId);
    if (!group?.passwordVerifier) {
      pushNotice("warning", "Kein Klassenpasswort vorhanden", "Für diese Klasse ist noch kein Passwort gesetzt.");
      return false;
    }

    const password = unlockedGroupPasswordsRef.current[groupId];
    if (!password) {
      pushNotice("warning", "Klasse zuerst entsperren", "Zum Anlegen verschlüsselter Schüler muss die Klasse zuerst entsperrt werden.");
      return false;
    }

    const isValidPassword = await verifyPassword(group.passwordVerifier, group.id, password);
    if (!isValidPassword) {
      clearUnlockedGroups({
        title: "Sitzungspasswörter zurückgesetzt",
        detail: "Das gespeicherte Klassenpasswort ist nicht mehr gültig. Entsperre die Klasse erneut.",
      });
      return false;
    }

    unlockActivityAtRef.current = Date.now();
    const encryptedName = await encryptText(fullName, password);
    const studentId = crypto.randomUUID();
    setStudentDatabase((current) =>
      addStudentToGroup(current, groupId, {
        id: studentId,
        alias,
        encryptedName,
        isAbsent: false,
        createdAt: new Date().toISOString(),
      }),
    );
    setActiveGroupId(groupId);
    setActiveStudentId(studentId);
    return true;
  };

  const handleApplyStudentOrder = (groupId: string, orderedStudentIds: string[]) => {
    setStudentDatabase((current) => setStudentOrderInGroup(current, groupId, orderedStudentIds));
  };

  const handleRemoveStudent = (groupId: string, studentId: string) => {
    setStudentDatabase((current) => {
      const nextDatabase = removeStudentFromGroup(current, groupId, studentId);

      if (activeStudentId === studentId) {
        const nextGroup = getStudentGroup(nextDatabase, groupId);
        const fallback = nextGroup?.students[0] ?? null;
        setActiveStudentId(fallback?.id ?? "");
      }

      if (activeGroupId === groupId && getStudentGroup(nextDatabase, groupId)?.students.length === 0) {
        setActiveStudentId("");
      }

      return nextDatabase;
    });
  };

  const handleRemoveGroup = (groupId: string) => {
    setStudentDatabase((current) => removeStudentGroup(current, groupId));
    setDraftBundle((current) => ({
      ...current,
      workspaces: current.workspaces.map((workspace) =>
        workspace.assignedGroupId === groupId ? { ...workspace, assignedGroupId: null } : workspace,
      ),
    }));
    const nextPasswords = { ...unlockedGroupPasswordsRef.current };
    if (groupId in nextPasswords) clearSensitiveGlobalSearch();
    delete nextPasswords[groupId];
    unlockedGroupPasswordsRef.current = nextPasswords;
    setUnlockedGroupIds((current) => current.filter((id) => id !== groupId));
    if (activeGroupId === groupId) {
      const fallbackGroup = studentDatabase.groups.find((group) => group.id !== groupId) ?? null;
      setActiveGroupId(fallbackGroup?.id ?? "");
      setActiveStudentId(fallbackGroup?.students[0]?.id ?? "");
    }
  };

  const handleTeacherCommentChange = (value: string) => {
    if (!activeStudentId) return;
    if (activeGroup?.passwordVerifier && !activeGroupPassword) return;
    setStudentDatabase((current) => {
      const next = updateTeacherComment(current, activeWorkspace?.id ?? null, activeStudentId, value);
      studentDatabaseRef.current = next;
      return next;
    });
  };

  const handleSignatureChange = (value: string | null) => {
    if (!activeGroup || !activeStudentId) return;
    if (activeGroup.passwordVerifier && !activeGroupPassword) return;
    setStudentDatabase((current) => {
      let next = updateStudentSignature(current, activeWorkspace?.id ?? null, activeStudentId, value);
      if (value === null && activeAssessment?.signatureDataUrl == null && activeGroup.defaultSignatureDataUrl) {
        next = updateGroupDefaultSignature(next, activeGroup.id, null);
      }
      studentDatabaseRef.current = next;
      return next;
    });
  };

  const handleRevealGroupStudentNames = async (groupId: string) => {
    const group = getStudentGroup(studentDatabaseRef.current, groupId);
    if (!group?.passwordVerifier) return {};

    const unlockedPassword = await getUsableUnlockedGroupPassword(groupId);
    if (!unlockedPassword) return {};

    const entries = await Promise.all(
      group.students.map(async (student) => {
        try {
          const fullName = await decryptText(student.encryptedName, unlockedPassword);
          return [student.id, fullName] as const;
        } catch {
          return null;
        }
      }),
    );

    return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null));
  };

  const handleExportDatabase = async (passphrase: string) => {
    if (!passphrase.trim()) {
      pushNotice("warning", "Backup-Passwort fehlt", "Bitte vergib ein Backup-Passwort für den Export.");
      return false;
    }

    const exportedAt = new Date().toISOString();
    try {
      const filename = buildAppBackupFilenameForClass(exportedAt, activeGroup?.className ?? null);
      const saveTarget = await prepareFileSave(filename, {
        description: "Verschlüsseltes EWH-Backup",
        accept: { "application/json": [".json"] },
      });

      if (!saveTarget) {
        pushNotice("info", "Backup-Speichern abgebrochen", "Es wurden keine Sicherungsdaten geschrieben.");
        return false;
      }

      const backup = await createEncryptedAppBackup({
        draftBundle,
        studentDatabase,
        archiveEntries,
      }, passphrase.trim(), exportedAt);
      const saveResult = await saveTarget.save(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      markBackupComplete(backup.exportedAt);
      setLastBackupAt(backup.exportedAt);
      setLastBackupFailure(null);
      pushNotice(
        "success",
        saveResult === "saved" ? "Backup gespeichert" : "Backup exportiert",
        saveResult === "saved"
          ? `Verschlüsseltes Backup am gewählten Speicherort erstellt: ${filename}.`
          : `Verschlüsseltes Backup erstellt am ${new Date(backup.exportedAt).toLocaleString("de-DE")}.`,
      );
      return true;
    } catch {
      const failure = { occurredAt: exportedAt, code: "BACKUP_EXPORT_FAILED" };
      markBackupFailed(failure.code, failure.occurredAt);
      setLastBackupFailure(failure);
      pushNotice(
        "danger",
        "Backup konnte nicht erstellt werden",
        "Die Daten wurden nicht exportiert. Prüfe Speicherort und Browserberechtigungen. Fehlercode: BACKUP_EXPORT_FAILED.",
      );
      return false;
    }
  };

  const openQuickBackupDialog = () => {
    setQuickBackupPassphrase("");
    setQuickBackupError("");
    setQuickBackupDialogOpen(true);
  };

  const createQuickBackup = async () => {
    const passphrase = quickBackupPassphrase.trim();
    if (!passphrase) {
      setQuickBackupError("Bitte vergib ein Passwort für das verschlüsselte Backup.");
      return;
    }

    setQuickBackupSaving(true);
    const saved = await handleExportDatabase(passphrase);
    setQuickBackupSaving(false);
    if (saved) {
      setQuickBackupDialogOpen(false);
      setQuickBackupPassphrase("");
    }
  };

  const handleArchiveSchoolYear = async (schoolYear: string, passphrase: string) => {
    if (!passphrase.trim()) {
      pushNotice("warning", "Archiv-Passwort fehlt", "Bitte vergib ein Passwort für die Schuljahr-Archivdatei.");
      return false;
    }

    const workspacesToArchive = draftBundle.workspaces.filter(
      (workspace) => getWorkspaceSchoolYear(workspace) === schoolYear,
    );
    if (workspacesToArchive.length === 0) {
      pushNotice("warning", "Kein Schuljahr ausgewählt", "Für dieses Schuljahr wurden keine Klassenarbeiten gefunden.");
      return false;
    }

    const exportedAt = new Date().toISOString();
    const filename = buildSchoolYearArchiveFilename(getSchoolYearLabel(schoolYear), exportedAt);
    const saveTarget = await prepareFileSave(filename, {
      description: "Verschlüsseltes Schuljahr-Archiv",
      accept: { "application/json": [".json"] },
    });

    if (!saveTarget) {
      pushNotice("info", "Schuljahr-Archiv abgebrochen", "Es wurden keine Klassenarbeiten entfernt.");
      return false;
    }

    const workspaceIds = new Set(workspacesToArchive.map((workspace) => workspace.id));
    const archivedStudentDatabase = createStudentDatabaseForWorkspaceArchive(studentDatabase, workspacesToArchive);
    const archivedDraftBundle: DraftBundle = {
      activeWorkspaceId: workspacesToArchive[0]?.id ?? "",
      workspaces: workspacesToArchive,
    };
    const encryptedArchive = await createEncryptedSchoolYearWorkspaceArchive(
      {
        draftBundle: archivedDraftBundle,
        studentDatabase: archivedStudentDatabase,
      },
      passphrase.trim(),
      getSchoolYearLabel(schoolYear),
      exportedAt,
    );

    const saveResult = await saveTarget.save(
      new Blob([JSON.stringify(encryptedArchive, null, 2)], { type: "application/json" }),
    );

    setRestoreCheckpoint(captureRestoreCheckpoint());
    const remainingWorkspaces = draftBundle.workspaces.filter((workspace) => !workspaceIds.has(workspace.id));
    const fallbackWorkspace = remainingWorkspaces.length === 0
      ? createDraftWorkspace(createEmptyExam(), "Neues Schuljahr")
      : null;
    const nextWorkspaces = fallbackWorkspace ? [fallbackWorkspace] : remainingWorkspaces;
    const nextActiveWorkspaceId = nextWorkspaces.some((workspace) => workspace.id === draftBundle.activeWorkspaceId)
      ? draftBundle.activeWorkspaceId
      : nextWorkspaces[0]?.id ?? "";

    setDraftBundle({
      activeWorkspaceId: nextActiveWorkspaceId,
      workspaces: nextWorkspaces,
    });
    setStudentDatabase((current) => {
      const next = removeWorkspaceAssessments(current, workspaceIds);
      studentDatabaseRef.current = next;
      return next;
    });
    const nextVersionedState = { ...lastVersionedExamByWorkspaceRef.current };
    workspaceIds.forEach((workspaceId) => {
      delete nextVersionedState[workspaceId];
    });
    if (fallbackWorkspace) {
      nextVersionedState[fallbackWorkspace.id] = JSON.stringify(fallbackWorkspace.exam);
    }
    lastVersionedExamByWorkspaceRef.current = nextVersionedState;
    setActiveSchoolYearFilter("all");
    setActiveTab("backup");
    pushNotice(
      "success",
      saveResult === "saved" ? "Schuljahr archiviert" : "Schuljahr exportiert",
      `${workspacesToArchive.length} Klassenarbeiten aus ${getSchoolYearLabel(schoolYear)} wurden gesichert und aus der Arbeitsoberfläche entfernt. Das EWH-Archiv blieb unverändert.`,
    );
    return true;
  };

  const handleStartSchoolYear = (schoolYear: string, studentListMode: "keep" | "delete") => {
    const normalizedSchoolYear = schoolYear.trim();
    if (!normalizedSchoolYear) {
      pushNotice("warning", "Schuljahr fehlt", "Bitte gib das neue Schuljahr ein, z. B. 2026/27.");
      return;
    }

    if (studentListMode === "delete") {
      setRestoreCheckpoint(captureRestoreCheckpoint());
    }

    setPendingSchoolYearCreation({
      schoolYear: normalizedSchoolYear,
      course: studentListMode === "keep" ? activeGroup?.className ?? "" : "",
    });
    setActiveSchoolYearFilter(normalizedSchoolYear);
    setActiveTab("guidedBuilder");
    setCollapsedSectionIds([]);

    if (studentListMode === "delete") {
      const emptyDatabase = createEmptyStudentDatabase();
      setStudentDatabase(emptyDatabase);
      studentDatabaseRef.current = emptyDatabase;
      clearSensitiveGlobalSearch();
      unlockedGroupPasswordsRef.current = {};
      setUnlockedGroupIds([]);
      setActiveGroupId("");
      setActiveStudentId("");
      clearBackupComplete();
      setLastBackupAt(null);
      clearBackupFailure();
      setLastBackupFailure(null);
    }

    pushNotice(
      "success",
      "Vorlage für neues Schuljahr wählen",
      studentListMode === "keep"
        ? `${normalizedSchoolYear} ist aktiv. Wähle jetzt eine Vorlage für die erste Klassenarbeit.`
        : `${normalizedSchoolYear} ist aktiv. Schülerlisten und Bewertungen wurden entfernt; wähle jetzt eine Vorlage für die erste Klassenarbeit.`,
    );
  };

  const handleRemoveWorkspace = (workspaceId: string) => {
    const deletesLastVisibleWorkspace =
      activeSchoolYearFilter !== "all" &&
      visibleWorkspaces.length === 1 &&
      visibleWorkspaces[0]?.id === workspaceId;

    removeWorkspace(workspaceId);

    if (deletesLastVisibleWorkspace) {
      setActiveSchoolYearFilter("all");
    }
  };

  const handleImportDatabase = (file: File, passphrase: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result;
      if (typeof content !== "string") return;
      void (async () => {
        try {
          const parsed = JSON.parse(content) as unknown;
          if (isEncryptedAppBackup(parsed)) {
            const importedAppState = await parseAppBackup(parsed, passphrase.trim());
            setPendingImportPreview({
              kind: "app-backup",
              sourceLabel: file.name,
              summary: `${importedAppState.draftBundle.workspaces.length} Klassenarbeiten, ${importedAppState.studentDatabase.groups.length} Lerngruppen, ${importedAppState.archiveEntries.length} Archiv-Einträge`,
              data: {
                draftBundle: importedAppState.draftBundle,
                archiveEntries: importedAppState.archiveEntries,
                studentDatabase: importedAppState.studentDatabase,
                exportedAt: parsed.exportedAt,
              },
            });
            return;
          }

          if (isEncryptedSchoolYearWorkspaceArchive(parsed)) {
            const importedArchive = await parseSchoolYearWorkspaceArchive(parsed, passphrase.trim());
            const snapshotCount = importedArchive.draftBundle.workspaces.reduce(
              (sum, workspace) => sum + workspace.versions.length,
              0,
            );
            setPendingImportPreview({
              kind: "schoolyear-workspace-archive",
              sourceLabel: file.name,
              summary: `${importedArchive.draftBundle.workspaces.length} Klassenarbeiten und ${snapshotCount} Schnappschüsse aus ${importedArchive.schoolYear}. EWH-Archiv-Einträge sind nicht enthalten.`,
              data: {
                draftBundle: importedArchive.draftBundle,
                studentDatabase: importedArchive.studentDatabase,
                schoolYear: importedArchive.schoolYear,
                exportedAt: importedArchive.exportedAt,
              },
            });
            return;
          }

          if (isEncryptedStudentDatabaseBackup(parsed)) {
            const importedDatabase = await parseStudentDatabaseBackup(parsed, passphrase.trim());
            setPendingImportPreview({
              kind: "student-database-backup",
              sourceLabel: file.name,
              summary: `${importedDatabase.groups.length} Lerngruppen und ${Object.keys(importedDatabase.assessments).length} Bewertungen`,
              data: {
                studentDatabase: importedDatabase,
                exportedAt: parsed.exportedAt,
              },
            });
            return;
          }

          if (isStudentDatabase(parsed)) {
            setPendingImportPreview({
              kind: "student-database-backup",
              sourceLabel: file.name,
              summary: `${parsed.groups.length} Lerngruppen und ${Object.keys(parsed.assessments).length} Bewertungen`,
              warning:
                "Legacy-Import ohne Verschlüsselungscontainer. Nur verwenden, wenn du die Datei selbst geprüft hast.",
              data: {
                studentDatabase: parsed,
                exportedAt: null,
              },
            });
            return;
          }

          pushNotice("danger", "Import fehlgeschlagen", "Die Sicherungsdatei ist ungültig.");
        } catch (error) {
          pushNotice("danger", "Import fehlgeschlagen", describeImportError(error));
        }
      })();
    };
    reader.readAsText(file);
  };

  const dismissImportPreview = () => {
    setPendingImportPreview(null);
    setRestoreOverwriteConfirmed(false);
    setPreRestoreBackupPassphrase("");
    setPreRestoreBackupError("");
    setPreRestoreBackupSaving(false);
  };

  const confirmImportPreview = () => {
    if (!pendingImportPreview) return;

    if (pendingImportPreview.kind === "app-backup") {
      applyImportedState(
        pendingImportPreview.data.draftBundle,
        pendingImportPreview.data.archiveEntries,
        pendingImportPreview.data.studentDatabase,
        pendingImportPreview.data.exportedAt,
      );
      pushNotice(
        "success",
        "Arbeitsstand importiert",
        `Importiert aus ${pendingImportPreview.sourceLabel} vom ${new Date(pendingImportPreview.data.exportedAt).toLocaleString("de-DE")}.`,
      );
      dismissImportPreview();
      return;
    }

    if (pendingImportPreview.kind === "schoolyear-workspace-archive") {
      const existingWorkspaceIds = new Set(draftBundle.workspaces.map((workspace) => workspace.id));
      const incomingWorkspaces = pendingImportPreview.data.draftBundle.workspaces.filter(
        (workspace) => !existingWorkspaceIds.has(workspace.id),
      );
      const skippedCount = pendingImportPreview.data.draftBundle.workspaces.length - incomingWorkspaces.length;

      if (incomingWorkspaces.length === 0) {
        pushNotice(
          "warning",
          "Schuljahr bereits vorhanden",
          "Alle Klassenarbeiten aus dieser Archivdatei sind bereits in der aktuellen Arbeitsliste vorhanden.",
        );
        dismissImportPreview();
        return;
      }

      setRestoreCheckpoint(captureRestoreCheckpoint());
      setDraftBundle((current) => ({
        activeWorkspaceId: current.activeWorkspaceId || incomingWorkspaces[0]?.id || "",
        workspaces: [...current.workspaces, ...incomingWorkspaces],
      }));
      setStudentDatabase((current) => {
        const next = mergeStudentDatabases(current, pendingImportPreview.data.studentDatabase);
        studentDatabaseRef.current = next;
        return next;
      });
      lastVersionedExamByWorkspaceRef.current = {
        ...lastVersionedExamByWorkspaceRef.current,
        ...Object.fromEntries(incomingWorkspaces.map((workspace) => [workspace.id, JSON.stringify(workspace.exam)])),
      };
      pushNotice(
        skippedCount > 0 ? "warning" : "success",
        "Schuljahr wiederhergestellt",
        `${incomingWorkspaces.length} Klassenarbeiten aus ${pendingImportPreview.data.schoolYear} wurden in die Arbeitsliste übernommen.${skippedCount > 0 ? ` ${skippedCount} vorhandene Klassenarbeiten wurden übersprungen.` : ""}`,
      );
      dismissImportPreview();
      setActiveSchoolYearFilter(incomingWorkspaces[0] ? getWorkspaceSchoolYear(incomingWorkspaces[0]) : "all");
      setActiveTab("backup");
      return;
    }

    applyImportedState(
      draftBundle,
      archiveEntries,
      pendingImportPreview.data.studentDatabase,
      pendingImportPreview.data.exportedAt,
    );
    pushNotice(
      pendingImportPreview.warning ? "warning" : "success",
      pendingImportPreview.warning ? "Legacy-Datenbank importiert" : "Schülerdatenbank importiert",
      pendingImportPreview.warning ?? `Quelle: ${pendingImportPreview.sourceLabel}.`,
    );
    dismissImportPreview();
  };

  const saveCurrentBackupThenConfirmImport = async () => {
    if (!pendingImportPreview) return;
    const passphrase = preRestoreBackupPassphrase.trim();
    if (!passphrase) {
      setPreRestoreBackupError("Bitte vergib ein Passwort für die Vorab-Sicherung.");
      return;
    }

    setPreRestoreBackupSaving(true);
    setPreRestoreBackupError("");
    try {
      const saved = await handleExportDatabase(passphrase);
      if (!saved) {
        setPreRestoreBackupError("Die Wiederherstellung wurde nicht übernommen, weil die Vorab-Sicherung nicht gespeichert wurde.");
        return;
      }
      confirmImportPreview();
    } catch {
      setPreRestoreBackupError("Die Vorab-Sicherung konnte nicht erstellt werden. Die Wiederherstellung wurde nicht übernommen.");
    } finally {
      setPreRestoreBackupSaving(false);
    }
  };

  const handleImportStudents = (
    file: File,
    access: { mode: GroupAccessMode; password?: string },
    subject: string,
    sortOptions: ImportSortOptions,
  ) => {
    void (async () => {
      try {
        const rows = sortImportedStudentRows(await parseStudentImportFile(file), sortOptions);
        if (rows.length === 0) {
          pushNotice("warning", "Keine gültigen Schülerdaten", "Die Importdatei enthält keine gültigen Schülerdaten.");
          return;
        }

        let nextDatabase = studentDatabase;
        const nextUnlockedPasswords = { ...unlockedGroupPasswordsRef.current };
        const passwordCache = new Map<string, string>();
        const importedStudentsPerClass = new Map<string, number>();
        const generatedSecurityTokens: SecurityTokenCard[] = [];
        const skippedClasses = new Set<string>();
        const groupByClassName = new Map(
          nextDatabase.groups.map((group) => [group.className.trim().toLocaleLowerCase("de-DE"), group]),
        );

        for (const row of rows) {
          const className = row.className.trim();
          const classKey = className.toLocaleLowerCase("de-DE");
          let group = groupByClassName.get(classKey) ?? null;

          if (!group) {
            if (access.mode === "manual" && !access.password?.trim()) {
              throw new Error("Fuer neue Klassen wird ein Import-Passwort benoetigt.");
            }

            group = createStudentGroup(subject.trim() || exam.meta.course || "Englisch", className);
            const nextToken = access.mode === "generated" ? generateSecurityToken() : access.password?.trim() ?? "";
            group.passwordVerifier = await createPasswordVerifier(group.id, nextToken);
            nextDatabase = addStudentGroup(nextDatabase, group);
            nextUnlockedPasswords[group.id] = nextToken;
            passwordCache.set(group.id, nextToken);
            groupByClassName.set(classKey, group);
            if (access.mode === "generated") {
              generatedSecurityTokens.push({
                groupId: group.id,
                subject: group.subject,
                className: group.className,
                token: nextToken,
              });
            }
          }

          if (!group.passwordVerifier) {
            skippedClasses.add(group.className);
            continue;
          }

          const password = passwordCache.get(group.id) ?? nextUnlockedPasswords[group.id] ?? "";
          if (!password) {
            skippedClasses.add(group.className);
            continue;
          }

          const isValidPassword = await verifyPassword(group.passwordVerifier, group.id, password);
          if (!isValidPassword) {
            skippedClasses.add(group.className);
            delete nextUnlockedPasswords[group.id];
            continue;
          }

          passwordCache.set(group.id, password);

          const alias = buildStudentAlias(
            group.className,
            group.students.length + 1,
            new Set(group.students.map((student) => student.alias)),
          );
          const encryptedName = await encryptText(`${row.lastName}, ${row.firstName}`, password);
          const studentId = crypto.randomUUID();

          nextDatabase = addStudentToGroup(nextDatabase, group.id, {
            id: studentId,
            alias,
            encryptedName,
            isAbsent: false,
            createdAt: new Date().toISOString(),
          });

          const updatedGroup = getStudentGroup(nextDatabase, group.id);
          if (updatedGroup) {
            groupByClassName.set(classKey, updatedGroup);
            group = updatedGroup;
          }

          importedStudentsPerClass.set(group.className, (importedStudentsPerClass.get(group.className) ?? 0) + 1);
        }

        const lockedGroupDuringImport = Object.keys(unlockedGroupPasswordsRef.current).some(
          (groupId) => !(groupId in nextUnlockedPasswords),
        );
        if (lockedGroupDuringImport) clearSensitiveGlobalSearch();
        unlockedGroupPasswordsRef.current = nextUnlockedPasswords;
        setUnlockedGroupIds(Object.keys(nextUnlockedPasswords));
        setStudentDatabase(nextDatabase);

        const firstImportedClassName = importedStudentsPerClass.keys().next().value as string | undefined;
        if (firstImportedClassName) {
          const importedGroup = nextDatabase.groups.find((group) => group.className === firstImportedClassName);
          if (importedGroup) {
            setActiveGroupId(importedGroup.id);
            const lastImportedStudent = importedGroup.students[importedGroup.students.length - 1] ?? null;
            setActiveStudentId(lastImportedStudent?.id ?? importedGroup.students[0]?.id ?? "");
          }
        }

        const importedCount = Array.from(importedStudentsPerClass.values()).reduce((sum, value) => sum + value, 0);
        const importedClasses = Array.from(importedStudentsPerClass.entries())
          .map(([groupClassName, count]) => `${groupClassName}: ${count}`)
          .join("\n");
        const skippedText = skippedClasses.size > 0
          ? ` Übersprungen: ${Array.from(skippedClasses).join(", ")}.`
          : "";
        pushNotice(
          skippedClasses.size > 0 ? "warning" : "success",
          "Klassenliste importiert",
          `Importiert: ${importedCount} Schüler. ${importedClasses.replace(/\n/g, " · ")}.${skippedText}`,
        );
        if (generatedSecurityTokens.length > 0) {
          setPendingSecurityTokenCards(generatedSecurityTokens);
        }
      } catch (error) {
        pushNotice("danger", "Klassenliste konnte nicht importiert werden", error instanceof Error ? error.message : undefined);
      }
    })();
  };

  const printWithResolvedIdentity = async (password?: string) => {
    const popup = openPrintPopupHost();
    if (!popup) {
      pushNotice("warning", "Druckfenster blockiert", "Bitte erlaube Pop-ups für diese Anwendung.");
      return false;
    }

    const latestAssessment = activeStudentId
      ? getStudentAssessment(studentDatabaseRef.current, activeStudentId, activeWorkspace?.id ?? null)
      : null;
    let fullName: string | null = null;
    if (activeStudentRecord && activeGroup?.passwordVerifier) {
      if (!password?.trim()) {
        popup.close();
        pushNotice("warning", "Klassenpasswort fehlt", "Bitte gib das Klassenpasswort ein.");
        return false;
      }
      const isValidPassword = await verifyPassword(activeGroup.passwordVerifier, activeGroup.id, password);
      if (!isValidPassword) {
        popup.close();
        pushNotice("danger", "Klassenpasswort falsch");
        return false;
      }
      try {
        unlockActivityAtRef.current = Date.now();
        fullName = await decryptText(activeStudentRecord.encryptedName, password);
      } catch {
        pushNotice("danger", "Klarname konnte nicht entschlüsselt werden");
        return false;
      }
    }

    const opened = openPrintWindow(displayExam, summary, activeStudentRecord && activeGroup
      ? {
          alias: activeStudentRecord.alias,
          fullName,
          subject: activeGroup.subject,
          className: activeGroup.className,
          teacherComment: latestAssessment?.teacherComment ?? "",
          signatureDataUrl: getEffectiveSignatureDataUrl(activeGroup, latestAssessment),
        }
      : undefined, undefined, popup);

    if (!opened) {
      popup.close();
      pushNotice("warning", "Druckfenster blockiert", "Bitte erlaube Pop-ups für diese Anwendung.");
      return false;
    }

    if (activeStudentId) {
      setStudentDatabase((current) => markStudentPrinted(current, activeWorkspace?.id ?? null, activeStudentId));
    }

    return true;
  };

  const printWholeClassWithResolvedIdentity = async (password?: string) => {
    if (!activeGroup) {
      pushNotice("warning", "Keine Klasse ausgewählt", "Bitte zuerst eine Klasse auswählen.");
      return false;
    }

    if (activeGroup.students.length === 0) {
      pushNotice("warning", "Keine Schüler vorhanden", "Die aktive Klasse enthält noch keine Schüler.");
      return false;
    }

    const popup = openPrintPopupHost();
    if (!popup) {
      pushNotice("warning", "Druckfenster blockiert", "Bitte erlaube Pop-ups für diese Anwendung.");
      return false;
    }

    const resolvedPassword = password?.trim() ?? "";
    if (activeGroup.passwordVerifier) {
      if (!resolvedPassword) {
        popup.close();
        pushNotice("warning", "Klassenpasswort fehlt", "Bitte gib das Klassenpasswort ein.");
        return false;
      }

      const isValidPassword = await verifyPassword(activeGroup.passwordVerifier, activeGroup.id, resolvedPassword);
      if (!isValidPassword) {
        popup.close();
        pushNotice("danger", "Klassenpasswort falsch");
        return false;
      }
      unlockActivityAtRef.current = Date.now();
    }

    const reports = [];
    for (const student of activeGroup.students) {
      const studentExam = buildExamForStudent(exam, studentDatabase, {
        groupId: activeGroup.id,
        studentId: student.id,
      }, activeWorkspace?.id ?? null);
      const studentSummary = calculateExamSummary(studentExam);
      const studentAssessment = getStudentAssessment(studentDatabaseRef.current, student.id, activeWorkspace?.id ?? null);
      let fullName: string | null = null;

      if (activeGroup.passwordVerifier) {
        try {
          fullName = await decryptText(student.encryptedName, resolvedPassword);
        } catch {
          popup.close();
          pushNotice("danger", "Klarname konnte nicht entschlüsselt werden", `Der Klarname für ${student.alias} konnte nicht entschlüsselt werden.`);
          return false;
        }
      }

      reports.push({
        exam: studentExam,
        summary: studentSummary,
        identity: {
          alias: student.alias,
          fullName,
          subject: activeGroup.subject,
          className: activeGroup.className,
          teacherComment: studentAssessment.teacherComment ?? "",
          signatureDataUrl: getEffectiveSignatureDataUrl(activeGroup, studentAssessment),
        },
      });
    }

    const opened = openBatchPrintWindow(reports, popup);
    if (!opened) {
      popup.close();
      pushNotice("warning", "Druckfenster blockiert", "Bitte erlaube Pop-ups für diese Anwendung.");
      return false;
    }

    setStudentDatabase((current) =>
      activeGroup.students.reduce(
        (database, student) => markStudentPrinted(database, activeWorkspace?.id ?? null, student.id),
        current,
      ),
    );
    return true;
  };

  const handlePrint = async () => {
    if (activeStudentRecord && activeGroup?.passwordVerifier) {
      const unlockedPassword = await getUsableUnlockedGroupPassword(activeGroup.id);
      if (unlockedPassword) {
        await printWithResolvedIdentity(unlockedPassword);
        return;
      }

      setPrintPasswordInput("");
      setPendingPrintMode("student");
      setPrintPasswordDialogOpen(true);
      return;
    }

    await printWithResolvedIdentity();
  };

  const handleExportDocx = async () => {
    let fullName: string | null = null;
    if (activeStudentRecord && activeGroup?.passwordVerifier) {
      const unlockedPassword = await getUsableUnlockedGroupPassword(activeGroup.id);
      if (!unlockedPassword) {
        pushNotice("warning", "Klasse zuerst entsperren", "Für den editierbaren Export werden die lokalen Bewertungsdaten benötigt.");
        return;
      }
      try {
        fullName = await decryptText(activeStudentRecord.encryptedName, unlockedPassword);
      } catch {
        pushNotice("danger", "Klarname konnte nicht entschlüsselt werden");
        return;
      }
    }

    const latestAssessment = activeStudentId
      ? getStudentAssessment(studentDatabaseRef.current, activeStudentId, activeWorkspace?.id ?? null)
      : null;
    const result = await exportEditableExamDocx(
      displayExam,
      summary,
      activeStudentRecord && activeGroup
        ? {
            alias: activeStudentRecord.alias,
            fullName,
            subject: activeGroup.subject,
            className: activeGroup.className,
            teacherComment: latestAssessment?.teacherComment ?? "",
          }
        : undefined,
    );
    if (result !== "cancelled") {
      pushNotice("success", "Word-Dokument erstellt", "Der Bewertungsbogen kann in Word oder LibreOffice weiterbearbeitet werden.");
    }
  };

  const handleExportClassDocx = async () => {
    if (!activeGroup) {
      pushNotice("warning", "Keine Klasse ausgewählt", "Bitte zuerst eine Klasse auswählen.");
      return;
    }
    if (activeGroup.students.length === 0) {
      pushNotice("warning", "Keine Schüler vorhanden", "Die aktive Klasse enthält noch keine Schüler.");
      return;
    }

    const password = activeGroup.passwordVerifier
      ? await getUsableUnlockedGroupPassword(activeGroup.id)
      : null;
    if (activeGroup.passwordVerifier && !password) {
      pushNotice("warning", "Klasse zuerst entsperren", "Für den Klassenexport werden die lokalen Bewertungsdaten benötigt.");
      return;
    }

    const reports = [];
    for (const student of activeGroup.students) {
      let fullName: string | null = null;
      if (password) {
        try {
          fullName = await decryptText(student.encryptedName, password);
        } catch {
          pushNotice("danger", "Klarname konnte nicht entschlüsselt werden", `Der Klarname für ${student.alias} konnte nicht entschlüsselt werden.`);
          return;
        }
      }
      const studentExam = buildExamForStudent(exam, studentDatabaseRef.current, {
        groupId: activeGroup.id,
        studentId: student.id,
      }, activeWorkspace?.id ?? null);
      const assessment = getStudentAssessment(studentDatabaseRef.current, student.id, activeWorkspace?.id ?? null);
      reports.push({
        exam: studentExam,
        summary: calculateExamSummary(studentExam),
        identity: {
          alias: student.alias,
          fullName,
          subject: activeGroup.subject,
          className: activeGroup.className,
          teacherComment: assessment.teacherComment ?? "",
        },
      });
    }

    const result = await exportClassEditableExamDocx(exam, reports);
    if (result !== "cancelled") {
      pushNotice("success", "Word-Klassendokument erstellt", "Die editierbare Punktetabelle für die aktive Klasse wurde erstellt.");
    }
  };

  const handleExportEmptyDocx = async () => {
    const emptyExam = {
      ...exam,
      sections: exam.sections.map((section) => ({
        ...section,
        tasks: section.tasks.map((task) => ({ ...task, achievedPoints: 0 })),
      })),
    };
    const result = await exportEditableExamDocx(emptyExam, calculateExamSummary(emptyExam), undefined, { hideResults: true });
    if (result !== "cancelled") {
      pushNotice("success", "Leerer Word-EWH erstellt", "Der editierbare Erwartungshorizont wurde ohne individuelle Bewertungsdaten erstellt.");
    }
  };

  const handleExportGradeScaleDocx = async () => {
    const result = await exportGradeScaleDocx(displayExam, summary, activeStudentRecord?.alias ?? displayExam.meta.title);
    if (result !== "cancelled") {
      pushNotice("success", "Word-Notenbereiche erstellt", "Der editierbare Notenschlüssel wurde erstellt.");
    }
  };

  const handleExportClassOverviewDocx = async () => {
    if (!activeGroup || !classOverview) {
      pushNotice("warning", "Keine Klassenübersicht verfügbar", "Bitte zuerst eine Klasse mit auswertbaren Daten auswählen.");
      return;
    }
    const result = await exportClassOverviewDocx(displayExam, classOverview, {
      subject: activeGroup.subject,
      className: activeGroup.className,
    });
    if (result !== "cancelled") {
      pushNotice("success", "Word-Klassenübersicht erstellt", "Die editierbare Klassenübersicht wurde erstellt.");
    }
  };

  const handlePrintWithoutDetails = async () => {
    const opened = openPrintWindow(
      displayExam,
      summary,
      activeStudentRecord && activeGroup
        ? {
            alias: activeStudentRecord.alias,
            subject: activeGroup.subject,
            className: activeGroup.className,
          }
        : undefined,
      {
        hideGrade: true,
        hideTeacherComment: true,
        hideSignature: true,
      },
    );

    if (!opened) {
      pushNotice("warning", "Druckfenster blockiert", "Bitte erlaube Pop-ups für diese Anwendung.");
    }
  };

  const handlePrintClass = async () => {
    if (activeGroup?.passwordVerifier) {
      const unlockedPassword = await getUsableUnlockedGroupPassword(activeGroup.id);
      if (unlockedPassword) {
        await printWholeClassWithResolvedIdentity(unlockedPassword);
        return;
      }

      setPrintPasswordInput("");
      setPendingPrintMode("class");
      setPrintPasswordDialogOpen(true);
      return;
    }

    await printWholeClassWithResolvedIdentity();
  };

  const handlePrintClassOverview = () => {
    if (!activeGroup) {
      pushNotice("warning", "Keine Klasse ausgewählt", "Bitte zuerst eine Klasse auswählen.");
      return;
    }

    if (activeGroup.passwordVerifier && !activeGroupPassword) {
      pushNotice("warning", "Klasse zuerst entsperren", "Die Klassenübersicht wird erst nach Entsperrung mit echten Bewertungsdaten erstellt.");
      return;
    }

    if (!classOverview) {
      pushNotice("warning", "Keine auswertbaren Daten", "Für die aktive Klasse liegen noch keine auswertbaren Daten vor.");
      return;
    }

    const opened = openClassOverviewPrintWindow(displayExam, classOverview, {
      subject: activeGroup.subject,
      className: activeGroup.className,
    });

    if (!opened) {
      pushNotice("warning", "Druckfenster blockiert", "Bitte erlaube Pop-ups für diese Anwendung.");
    }
  };

  const handlePrintGradeScale = () => {
    const opened = openGradeScalePrintWindow(
      displayExam,
      summary,
      activeStudentRecord?.alias ?? displayExam.meta.title,
    );

    if (!opened) {
      pushNotice("warning", "Druckfenster blockiert", "Bitte erlaube Pop-ups für diese Anwendung.");
    }
  };

  const handleExportStudentCsv = () => {
    if (activeGroup?.passwordVerifier && !activeGroupPassword) {
      pushNotice("warning", "Klasse zuerst entsperren", "CSV-Exporte mit Bewertungsdaten sind für diese Lerngruppe erst nach Entsperrung möglich.");
      return;
    }

    exportStudentExamCsv(
      displayExam,
      summary,
      activeStudentRecord && activeGroup
        ? {
            alias: activeStudentRecord.alias,
            fullName: activeStudentLiveLabelTitle === "Aktiver Schülername" ? activeStudentLiveLabel : null,
            subject: activeGroup.subject,
            className: activeGroup.className,
            teacherComment: activeAssessment?.teacherComment ?? "",
          }
        : undefined,
    );
  };

  const handleExportClassCsv = async () => {
    if (!activeGroup) {
      pushNotice("warning", "Keine Klasse ausgewählt", "Bitte zuerst eine Klasse auswählen.");
      return;
    }

    if (activeGroup.students.length === 0) {
      pushNotice("warning", "Keine Schüler vorhanden", "Die aktive Klasse enthält noch keine Schüler.");
      return;
    }

    if (activeGroup.passwordVerifier && !activeGroupPassword) {
      pushNotice("warning", "Klasse zuerst entsperren", "Klassenexporte mit Bewertungsdaten sind erst nach Entsperrung möglich.");
      return;
    }

    const namesByStudentId: Record<string, string> = {};
    if (activeGroup.passwordVerifier) {
      const unlockedPassword = await getUsableUnlockedGroupPassword(activeGroup.id);
      if (unlockedPassword) {
        const resolvedNames = await Promise.all(
          activeGroup.students.map(async (student) => {
            try {
              const fullName = await decryptText(student.encryptedName, unlockedPassword);
              return [student.id, fullName] as const;
            } catch {
              return null;
            }
          }),
        );
        resolvedNames.forEach((entry) => {
          if (!entry) return;
          namesByStudentId[entry[0]] = entry[1];
        });
      }
    }

    const rows = activeGroup.students.map((student) => {
      const studentExam = buildExamForStudent(exam, studentDatabaseRef.current, {
        groupId: activeGroup.id,
        studentId: student.id,
      }, activeWorkspace?.id ?? null);
      const studentSummary = calculateExamSummary(studentExam);
      const assessment = getStudentAssessment(studentDatabaseRef.current, student.id, activeWorkspace?.id ?? null);

      return {
        Schuelercode: student.alias,
        Schuelername: namesByStudentId[student.id] ?? "",
        Anwesend: student.isAbsent ? "nein" : "ja",
        Fach: activeGroup.subject,
        Klasse: activeGroup.className,
        Titel: exam.meta.title,
        Datum: exam.meta.examDate,
        Punkte: studentSummary.totalAchievedPoints,
        MaxPunkte: studentSummary.totalMaxPoints,
        Prozent: Number(studentSummary.finalPercentage.toFixed(1)),
        Note: studentSummary.grade.label,
        Notenstufe: studentSummary.grade.verbalLabel,
        Kommentar: resolveCommentTemplate(assessment.teacherComment ?? "", {
          alias: student.alias,
          fullName: namesByStudentId[student.id] ?? null,
          subject: activeGroup.subject,
          className: activeGroup.className,
          examTitle: exam.meta.title,
          examDate: exam.meta.examDate,
          totalAchievedPoints: studentSummary.totalAchievedPoints,
          totalMaxPoints: studentSummary.totalMaxPoints,
          percentage: studentSummary.finalPercentage,
          gradeLabel: studentSummary.grade.label,
          gradeVerbalLabel: studentSummary.grade.verbalLabel,
        }),
        ZuletztAktualisiert: assessment.updatedAt,
        GedrucktAm: assessment.printedAt ?? "",
      };
    });

    void downloadCsvFile(`${activeGroup.className || "Klasse"}_Klassendaten.csv`, rows);
  };

  const handleExportClassOverviewCsv = () => {
    if (!activeGroup) {
      pushNotice("warning", "Keine Klasse ausgewählt", "Bitte zuerst eine Klasse auswählen.");
      return;
    }

    if (activeGroup.passwordVerifier && !activeGroupPassword) {
      pushNotice("warning", "Klasse zuerst entsperren", "Die Klassenübersicht wird erst nach Entsperrung berechnet und exportiert.");
      return;
    }

    if (!classOverview) {
      pushNotice("warning", "Keine auswertbaren Daten", "Für die aktive Klasse liegen noch keine auswertbaren Daten vor.");
      return;
    }

    exportClassOverviewCsv(displayExam, classOverview, {
      subject: activeGroup.subject,
      className: activeGroup.className,
    });
  };

  const handleExportGradeScaleCsv = () => {
    exportGradeScaleCsv(displayExam, summary, activeStudentRecord?.alias ?? displayExam.meta.title);
  };

  const getScoringExportStudents = () =>
    activeGroup?.students.map((student) => ({
      alias: student.alias,
      fullName: "",
      isAbsent: student.isAbsent,
      scores: getStudentAssessment(studentDatabaseRef.current, student.id, activeWorkspace?.id ?? null).taskScores,
    }));

  const handleExportScoringCsv = () => {
    exportScoringSheetCsv(exam, {
      subject: activeGroup?.subject ?? exam.meta.subject,
      className: activeGroup?.className ?? exam.meta.course,
      students: getScoringExportStudents(),
    });
  };

  const handleExportScoringOds = () => {
    void exportScoringSheetOds(exam, {
      subject: activeGroup?.subject ?? exam.meta.subject,
      className: activeGroup?.className ?? exam.meta.course,
      students: getScoringExportStudents(),
    });
  };

  const handleExportScoringXlsx = () => {
    void exportScoringSheetXlsx(exam, {
      subject: activeGroup?.subject ?? exam.meta.subject,
      className: activeGroup?.className ?? exam.meta.course,
      students: getScoringExportStudents(),
    });
  };

  const printLabel = activeStudentRecord ? `Schülerbogen drucken (${activeStudentRecord.alias})` : "PDF / Drucken";
  const printWithoutDetailsLabel = activeStudentRecord
    ? `Leerer EWH (${activeStudentRecord.alias})`
    : "Leerer EWH";
  const printGradeScaleLabel = "Notenbereiche als PDF";
  const classPrintLabel = activeGroup ? `Klasse drucken (${activeGroup.className})` : "Klasse als PDF";
  const classOverviewPrintLabel = activeGroup
    ? `Klassenübersicht drucken (${activeGroup.className})`
    : "Klassenübersicht als PDF";
  const exportCsvStudentLabel = activeStudentRecord ? `SuS als CSV (${activeStudentRecord.alias})` : "SuS als CSV";
  const exportCsvClassLabel = activeGroup ? `Klasse als CSV (${activeGroup.className})` : "Klasse als CSV";
  const exportCsvClassOverviewLabel = activeGroup
    ? `Klassenübersicht als CSV (${activeGroup.className})`
    : "Klassenübersicht als CSV";
  const exportCsvGradeScaleLabel = "Notenbereiche als CSV";
  const exportScoringCsvLabel = activeGroup ? `Punktetabelle CSV (${activeGroup.className})` : "Punktetabelle CSV";
  const exportScoringOdsLabel = activeGroup ? `Punktetabelle ODS (${activeGroup.className})` : "Punktetabelle ODS";
  const exportScoringXlsxLabel = activeGroup ? `Punktetabelle XLSX (${activeGroup.className})` : "Punktetabelle XLSX";
  const printHint = activeStudentRecord
    ? activeGroup?.passwordVerifier
      ? assessmentLocked
        ? "Geschützte Lerngruppe: erst entsperren, dann stehen Druck und CSV mit vollständigen Bewertungsdaten bereit."
        : "Geschützte Lerngruppe entsperrt: Druck und CSV arbeiten mit lokal entschlüsselten Bewertungsdaten."
      : "Für diese Klasse ist noch kein Passwort gesetzt. Ausdrucke und CSV-Exporte nutzen deshalb nur den Schülercode."
    : "PDF für Ausdrucke, CSV für Tabellenkalkulationen und JSON für Sicherungen.";
  const currentSchoolYearPillLabel = activeSchoolYearFilter === "all"
    ? getSchoolYearLabel(activeWorkspace ? getWorkspaceSchoolYear(activeWorkspace) : draftBundle.workspaces[0] ? getWorkspaceSchoolYear(draftBundle.workspaces[0]) : "")
    : getSchoolYearLabel(activeSchoolYearFilter);

  const handlePrintSecurityTokens = () => {
    const opened = openSecurityTokenPrintWindow(pendingSecurityTokenCards);
    if (!opened) {
      pushNotice("warning", "Druckfenster blockiert", "Bitte erlaube Pop-ups für diese Anwendung.");
      return;
    }
    setPendingSecurityTokenCards([]);
    pushNotice("success", "Druckkarte geöffnet", "Die Token stehen im neuen Fenster zum Drucken oder als PDF-Speichern bereit.");
  };

  const resolvedTeacherCommentPreview = resolveCommentTemplate(activeAssessment?.teacherComment ?? "", {
    alias: activeStudentRecord?.alias ?? "",
    fullName: activeStudentLiveLabelTitle === "Aktiver Schülername" ? activeStudentLiveLabel : null,
    subject: activeGroup?.subject,
    className: activeGroup?.className,
    examTitle: displayExam.meta.title,
    examDate: displayExam.meta.examDate,
    totalAchievedPoints: summary.totalAchievedPoints,
    totalMaxPoints: summary.totalMaxPoints,
    percentage: summary.finalPercentage,
    gradeLabel: summary.grade.label,
    gradeVerbalLabel: summary.grade.verbalLabel,
  });
  const activeGuideStep = firstRunGuideSteps[guideStepIndex] ?? firstRunGuideSteps[0];
  const guideProgressLabel = `${guideStepIndex + 1} / ${firstRunGuideSteps.length}`;
  if (storageError) {
    return <StorageUnavailableScreen title={storageError.title} detail={storageError.detail} onReload={() => window.location.reload()} />;
  }

  if (!storageReady) {
    return <StorageLoadingScreen />;
  }

  return (
    <AppShell appShellRef={appShellRef}>
      <FirstRunGuide
        open={guideOpen}
        dialogRef={guideDialogRef}
        titleRef={guideTitleRef}
        activeStep={activeGuideStep}
        stepIndex={guideStepIndex}
        progressLabel={guideProgressLabel}
        onDialogKeyDown={handleGuideKeyDown}
        onClose={() => closeUserGuide(false)}
        onActivateStepTarget={activateGuideStepTarget}
        onStepChange={setGuideStepIndex}
        onPrevious={() => setGuideStepIndex((current) => Math.max(0, current - 1))}
        onNext={() => setGuideStepIndex((current) => Math.min(firstRunGuideSteps.length - 1, current + 1))}
        onDismiss={() => closeUserGuide(true)}
      />
      <div className="mx-auto max-w-[1880px]">
        <AppHeader
          currentSchoolYearPillLabel={currentSchoolYearPillLabel}
          visualTheme={visualTheme}
          onVisualThemeChange={setVisualTheme}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
          isAppFullscreen={isAppFullscreen}
          isFullscreenAvailable={document.fullscreenEnabled}
          onToggleAppFullscreen={toggleAppFullscreen}
          onOpenUserGuide={openUserGuide}
        />

        <AppStatusArea
          notice={appNotice}
          isDemoModeEnabled={isDemoModeEnabled}
          demoWorkspaceId={draftBundle.activeWorkspaceId}
          onResetDemoWorkspace={resetDemoWorkspace}
        />

        <AppNavigation
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onTabKeyDown={handleTabKeyDown}
          localSaveState={localSaveState}
          tabButtonRefs={tabButtonRefs}
          searchResults={globalSearchResults}
          sensitiveSearchSessionVersion={sensitiveSearchSessionVersion}
          onSearchResultSelect={openGlobalSearchResult}
        />

        <section className="mb-5 no-print">
          <div className="workspace-bar">
            <div className="workspace-bar-primary">
              <label className="workspace-year-select">
                <span>Schuljahr</span>
                <select
                  className="field"
                  value={activeSchoolYearFilter}
                  onChange={(event) => setActiveSchoolYearFilter(event.target.value)}
                >
                  <option value="all">Alle Schuljahre</option>
                  {schoolYearNavigationOptions.map((schoolYear) => (
                    <option key={schoolYear || "empty-school-year-navigation"} value={schoolYear}>
                      {getSchoolYearLabel(schoolYear)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="min-w-0 flex-1">
                <div className="workspace-mobile-select md:hidden">
                  <label>
                    <span className="sr-only">Aktive Klassenarbeit auswählen</span>
                    <select className="field" value={activeWorkspace?.id ?? ""} onChange={(event) => setActiveWorkspaceId(event.target.value)}>
                      {visibleWorkspaces.map((workspace) => (
                        <option key={workspace.id} value={workspace.id}>
                          {getWorkspaceDisplayLabel(workspace)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="hidden min-w-0 overflow-x-auto md:block">
                  <div className="workspace-tabs">
                  {visibleWorkspaces.map((workspace) => (
                    <button
                      type="button"
                      key={workspace.id}
                      className={`workspace-tab ${
                        workspace.id === draftBundle.activeWorkspaceId
                          ? "workspace-tab-active"
                          : ""
                      }`}
                      onClick={() => setActiveWorkspaceId(workspace.id)}
                    >
                      {getWorkspaceDisplayLabel(workspace)}
                    </button>
                  ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="workspace-bar-actions">
              {activeWorkspace ? (
                <button
                  type="button"
                  className="workspace-history-button"
                  onClick={() => setVersionListCollapsed((current) => !current)}
                  aria-expanded={!versionListCollapsed}
                >
                  Verlauf{activeWorkspace.versions.length > 0 ? ` · ${activeWorkspace.versions.length}` : ""}
                  {versionListCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                </button>
              ) : null}
              <button
                type="button"
                className="workspace-icon-button"
                onClick={() => setActiveTab("guidedBuilder")}
                aria-label="Neuen Erwartungshorizont anlegen"
                title="Neuen Erwartungshorizont anlegen"
              >
                <PlusIcon />
              </button>
              <details className="workspace-actions">
                <summary title="Weitere Aktionen" aria-label="Weitere Aktionen">•••</summary>
                <div className="workspace-actions-menu">
                  <button
                    type="button"
                    onClick={() => activeWorkspace && setWorkspaceToDelete(activeWorkspace)}
                    disabled={draftBundle.workspaces.length <= 1 || !activeWorkspace}
                  >
                    <ArchiveIcon />
                    Aktive Arbeit löschen
                  </button>
                </div>
              </details>
            </div>
            {hasNoAssignedWorkspaceForActiveGroup ? (
              <p className="workspace-inline-notice">Dieser Lerngruppe ist noch keine Klassenarbeit zugeordnet.</p>
            ) : null}
          </div>
          {activeWorkspace && !versionListCollapsed ? (
            <WorkspaceVersionPanel
              workspace={activeWorkspace}
              workspaceLabel={getWorkspaceDisplayLabel(activeWorkspace)}
              collapsed={versionListCollapsed}
              maxVersions={MAX_WORKSPACE_VERSIONS}
              onToggleCollapsed={() => setVersionListCollapsed((current) => !current)}
              onSaveVersion={() => saveWorkspaceVersion(activeWorkspace.id)}
              onRestoreVersion={(version) =>
                setPendingVersionRestore({
                  workspaceId: activeWorkspace.id,
                  workspaceLabel: getWorkspaceDisplayLabel(activeWorkspace),
                  version,
                })
              }
            />
          ) : null}
        </section>

        <div
          className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 ${
            activeTab === "guidedBuilder" || activeTab === "home"
              ? "xl:grid-cols-[320px_minmax(0,1fr)]"
              : "xl:grid-cols-[320px_minmax(0,1fr)_360px]"
          }`}
        >
          <aside className="min-w-0">
            <StudentSelectionPanel
              database={studentDatabase}
              workspaces={visibleWorkspaces}
              activeExam={exam}
              activeWorkspaceId={draftBundle.activeWorkspaceId}
              activeGroupId={activeGroupId}
              activeStudentId={activeStudentId}
              onSelectGroup={(groupId) => setActiveGroupId(groupId)}
              onSelectWorkspace={(workspaceId) => {
                setActiveWorkspaceId(workspaceId);
                setActiveTab("builder");
              }}
              onSelectStudent={(studentId) => openStudentInBuilder(studentId)}
              onRevealGroupStudentNames={handleRevealGroupStudentNames}
              isSelectedGroupUnlocked={Boolean(activeGroupPassword)}
              activeGroupIsProtected={activeGroupIsProtected}
              securityActionLabel={activeUnlockButtonLabel}
              onToggleSecurity={handleHeaderLockToggle}
            />
          </aside>

          <main className="min-w-0 space-y-6">
            <div
              id={getTabPanelId("home")}
              role="tabpanel"
              aria-labelledby={getTabButtonId("home")}
              hidden={activeTab !== "home"}
              tabIndex={0}
            >
              {activeTab === "home" ? (
                <HomeDashboard
                  activeWorkspaceLabel={activeWorkspace ? getWorkspaceDisplayLabel(activeWorkspace) : null}
                  activeWorkspaceUpdatedAt={activeWorkspace?.updatedAt ?? null}
                  hasActiveGroup={Boolean(activeGroup)}
                  activeGroupLabel={activeGroup ? `${activeGroup.subject} · ${activeGroup.className}` : null}
                  activeGroupStudentCount={activeGroup?.students.length ?? 0}
                  workspaceCount={draftBundle.workspaces.length}
                  archiveCount={archiveEntries.length}
                  sectionCount={activeWorkspace?.exam.sections.length ?? 0}
                  pointCount={activeWorkspace ? summary.totalMaxPoints : 0}
                  correctedCount={correctionCompletionState.correctedCount}
                  relevantStudentCount={correctionCompletionState.relevantStudentCount}
                  backupSummary={backupStatus.summary}
                  backupDetail={backupStatus.detail}
                  backupTone={backupStatus.tone}
                  recentWorkspaces={[...draftBundle.workspaces]
                    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
                    .slice(0, 4)
                    .map((workspace) => {
                      const workspaceGroup = workspace.assignedGroupId
                        ? getStudentGroup(studentDatabase, workspace.assignedGroupId)
                        : null;
                      const meta = [workspace.exam.meta.subject, workspaceGroup?.className ?? workspace.exam.meta.course]
                        .filter(Boolean)
                        .join(" · ");
                      return {
                        id: workspace.id,
                        label: getWorkspaceDisplayLabel(workspace),
                        meta: meta || "Erwartungshorizont",
                        updatedAt: workspace.updatedAt,
                        isActive: workspace.id === activeWorkspace?.id,
                      };
                    })}
                  onNavigate={activateTab}
                  onQuickBackup={openQuickBackupDialog}
                  onOpenWorkspace={(workspaceId) => {
                    const workspace = draftBundle.workspaces.find((entry) => entry.id === workspaceId);
                    if (workspace?.assignedGroupId) setActiveGroupId(workspace.assignedGroupId);
                    setActiveWorkspaceId(workspaceId);
                    activateTab("builder");
                  }}
                />
              ) : null}
            </div>
            <div
              id={getTabPanelId("groups")}
              role="tabpanel"
              aria-labelledby={getTabButtonId("groups")}
              hidden={activeTab !== "groups"}
              tabIndex={0}
              className="space-y-6"
            >
            {activeTab === "groups" && (
              <StudentRosterPanel
                database={studentDatabase}
                workspaces={draftBundle.workspaces}
                defaultImportSubject={activeGroup?.subject || "Englisch"}
                activeGroupId={activeGroupId}
                activeStudentId={activeStudentId}
                activeGroupHasPassword={Boolean(activeGroup?.passwordVerifier)}
                isActiveGroupUnlocked={Boolean(activeGroupPassword)}
                backupStatus={backupStatus}
                lastBackupAt={lastBackupAt}
                onSelectGroup={(groupId) => setActiveGroupId(groupId)}
                onSelectStudent={(studentId) => setActiveStudentId(studentId)}
                onAddGroup={handleAddGroup}
                onAddStudent={handleAddStudent}
                onRemoveStudent={handleRemoveStudent}
                unlockedGroupIds={unlockedGroupIds}
                onImportStudents={handleImportStudents}
                onRemoveGroup={(groupId, groupLabel, studentCount) =>
                  setGroupToDelete({ id: groupId, label: groupLabel, studentCount })
                }
                onRevealGroupStudentNames={handleRevealGroupStudentNames}
                onApplyStudentOrder={handleApplyStudentOrder}
                onExportDatabase={handleExportDatabase}
                onImportDatabase={handleImportDatabase}
                canRollbackImport={Boolean(restoreCheckpoint)}
                onRollbackImport={rollbackLastImport}
              />
            )}
            </div>

            <div
              id={getTabPanelId("builder")}
              role="tabpanel"
              aria-labelledby={getTabButtonId("builder")}
              hidden={activeTab !== "builder"}
              tabIndex={0}
              className="space-y-6"
            >
            {activeTab === "builder" && (
              <div id={EDITOR_METADATA_ANCHOR_ID} className="scroll-mt-24">
                <Card title="Metadaten" subtitle="Rahmendaten der Klassenarbeit, der Lerngruppe und der Lehrkraft.">
                  <ExamHeaderForm
                    meta={exam.meta}
                    disabled={!activeWorkspace}
                    onChange={(key, value) =>
                      setActiveWorkspaceExam((current) => ({ ...current, meta: { ...current.meta, [key]: value } }))
                    }
                  />
                  {!activeWorkspace ? (
                    <div className="surface-muted mt-4 rounded-2xl p-4">
                      <p className="label">Noch kein EWH zugeordnet</p>
                      <p className="themed-muted mt-2 text-sm leading-6">
                        Für diese Lerngruppe ist noch keine Klassenarbeit hinterlegt. Die Felder bleiben leer,
                        bis du einen EWH über „EWH erstellen“ anlegst oder aus dem Archiv zuweist.
                      </p>
                    </div>
                  ) : null}
                </Card>
              </div>
            )}
            </div>

            <div
              id={getTabPanelId("guidedBuilder")}
              role="tabpanel"
              aria-labelledby={getTabButtonId("guidedBuilder")}
              hidden={activeTab !== "guidedBuilder"}
              tabIndex={0}
              className="space-y-6"
            >
            {activeTab === "guidedBuilder" && (
              <Suspense
                fallback={(
                  <Card title="EWH-Erstellung lädt" subtitle="Vorlagen und Werkzeuge werden bei Bedarf nachgeladen.">
                    <div className="surface-muted rounded-3xl p-5">
                      <p className="themed-muted text-sm leading-6">
                        Die Vorlagenoberfläche wird vorbereitet.
                      </p>
                    </div>
                  </Card>
                )}
              >
                {loadedExamTemplates ? (
                  <GuidedExamBuilder
                    groups={studentDatabase.groups.map((group) => ({
                      id: group.id,
                      subject: group.subject,
                      className: group.className,
                    }))}
                    activeGroupId={activeGroupId}
                    templates={loadedExamTemplates}
                    initialTotalPoints={summary.totalMaxPoints}
                    initialGradeScale={exam.gradeScale}
                    initialSubject={activeGroup?.subject || ""}
                    initialMeta={{
                      ...exam.meta,
                      schoolYear: pendingSchoolYearCreation?.schoolYear ?? exam.meta.schoolYear,
                      course: pendingSchoolYearCreation?.course ?? exam.meta.course,
                    }}
                    initialSections={exam.sections.map((section) => ({
                      id: section.id,
                      title: section.title,
                      weight: section.weight,
                      description: section.description,
                    }))}
                    initialTarget={pendingSchoolYearCreation ? "new" : undefined}
                    lockTargetToNew={Boolean(pendingSchoolYearCreation)}
                    allowUnassignedWorkspace={Boolean(pendingSchoolYearCreation)}
                    onSelectTemplate={(template, target, gradeScale, meta, targetGroupId, targetTotalPoints) => {
                      applyTemplate(
                        template,
                        target,
                        gradeScale,
                        { ...meta },
                        targetGroupId,
                        targetTotalPoints,
                      );
                    }}
                    onApplyManualStructure={applyGuidedBuilderStructure}
                    onApplyPdfSuggestion={applyImportedExamSuggestion}
                  />
                ) : (
                  <Card title="EWH-Erstellung lädt" subtitle="Vorlagen und Werkzeuge werden bei Bedarf nachgeladen.">
                    <div className="surface-muted rounded-3xl p-5">
                      <p className="themed-muted text-sm leading-6">
                        Die Template-Daten werden vorbereitet.
                      </p>
                    </div>
                  </Card>
                )}
              </Suspense>
            )}
            </div>

            <div hidden={activeTab !== "builder"} className="space-y-6">
            {activeTab === "builder" && (
              <>
                {activeWorkspace ? (
                  <div id={EDITOR_POINTS_ANCHOR_ID} className="scroll-mt-24 space-y-6">
                    <div className="flex flex-col gap-3 rounded-3xl border p-4 surface-muted sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="label">Wiederverwenden</p>
                        <p className="themed-muted mt-1 text-sm leading-6">
                          Lege diese Arbeit als eigenständige Vorlage im Archiv ab.
                        </p>
                      </div>
                      <button type="button" className="button-secondary shrink-0 gap-2" onClick={saveExpectationsToArchive}>
                        <ArchiveIcon />
                        Diese Arbeit archivieren
                      </button>
                    </div>
                    <Card
                      title="Punkte und Note"
                      subtitle="Skaliere bei Bedarf die Gesamtpunktzahl und passe darunter den Notenschlüssel an. Die Gesamtnote wird weiterhin direkt über die erreichten Gesamtpunkte berechnet."
                      actions={
                        <div className="control-shell inline-flex items-center gap-1 rounded-full border p-1">
                          <IconButton
                            onClick={() => setPointsAndGradeSectionCollapsed((current) => !current)}
                            title={pointsAndGradeSectionCollapsed ? "Aufklappen" : "Zuklappen"}
                            className="px-2.5 py-2 text-xs"
                          >
                            {pointsAndGradeSectionCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                          </IconButton>
                        </div>
                      }
                    >
                      {!pointsAndGradeSectionCollapsed && (
                        <>
                          <section aria-labelledby={EDITOR_POINT_SCALING_ANCHOR_ID}>
                            <div className="mb-4">
                              <h3 id={EDITOR_POINT_SCALING_ANCHOR_ID} className="scroll-mt-24 subsection-title text-lg font-semibold">
                                Gesamtpunktzahl skalieren
                              </h3>
                              <p className="subsection-copy mt-1 text-sm leading-6">
                                Alle Maximalpunkte werden proportional umgerechnet und als echte Daten gespeichert.
                              </p>
                            </div>
                            <PointScaleControl
                              embedded
                              currentTotal={summary.totalMaxPoints}
                              onApply={(targetTotal, scaleAchieved) =>
                                setActiveWorkspaceExam((current) => scaleExamPoints(current, targetTotal, scaleAchieved))
                              }
                            />
                          </section>

                          <div className="my-8 flex justify-center">
                            <hr className="section-divider w-[90%]" />
                          </div>

                          <section aria-labelledby={EDITOR_GRADE_SCALE_ANCHOR_ID}>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h3 id={EDITOR_GRADE_SCALE_ANCHOR_ID} className="scroll-mt-24 subsection-title text-lg font-semibold">
                                  Notenschlüssel bearbeiten
                                </h3>
                                <p className="subsection-copy mt-1 text-sm leading-6">
                                  Aktiv ist die direkte Berechnung: Alle erreichten Punkte werden ohne Abschnittsgewichtung zusammengezählt.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className={showGradeScaleEditor ? "button-primary" : "button-secondary"}
                                  onClick={() => setShowGradeScaleEditor((current) => !current)}
                                >
                                  Notenschlüssel bearbeiten
                                </button>
                              </div>
                            </div>
                            {hasPointWeightMismatch && (
                              <div className="mt-3">
                                <DismissibleCallout
                                  tone="warning"
                                  resetKey={displayExam.sections
                                    .map((section) => `${section.id}:${section.weight}:${section.maxPointsOverride ?? "auto"}:${section.tasks.map((task) => task.maxPoints).join(",")}`)
                                    .join("|")}
                                >
                                  Die aktuellen Maximalpunkte passen noch nicht zu den eingetragenen Abschnitts-Gewichtungen. Die Prozentwerte bleiben als Orientierung sichtbar, die Gesamtnote wird aber weiterhin nur über Punkte berechnet.
                                </DismissibleCallout>
                              </div>
                            )}
                          </section>

                          <div className="my-8 flex justify-center">
                            <hr className="section-divider w-[90%]" />
                          </div>

                          <div id={EDITOR_GRADE_RANGES_ANCHOR_ID} className="scroll-mt-24">
                            <GradeScaleRangeSection
                              exam={displayExam}
                              totalMaxPoints={summary.totalMaxPoints}
                              title="Notenbereiche"
                              subtitle="Ausgeschriebene Punktespannen je Note auf Basis der aktuellen Gesamtpunktzahl."
                            />
                          </div>
                        </>
                      )}
                    </Card>

                    {showGradeScaleEditor && !pointsAndGradeSectionCollapsed && (
                      <GradeScaleEditor
                        scale={exam.gradeScale}
                        totalMaxPoints={summary.totalMaxPoints}
                        onChange={(nextScale) => updateExam({ gradeScale: nextScale })}
                        onBandChange={(bandId, lowerBound, verbalLabel) =>
                          updateExam({
                            gradeScale: {
                              ...exam.gradeScale,
                              bands: exam.gradeScale.bands.map((band) =>
                                band.id === bandId ? { ...band, lowerBound, verbalLabel } : band,
                              ),
                            },
                          })
                        }
                      />
                    )}
                  </div>
                ) : (
                  <Card
                    title="Punkte und Note"
                    subtitle="Für diese Lerngruppe ist noch kein EWH vorhanden."
                  >
                    <div className="surface-muted rounded-2xl p-5">
                      <p className="themed-strong text-base font-semibold">Noch kein Erwartungshorizont vorhanden</p>
                      <p className="themed-muted mt-2 text-sm leading-6">
                        Sobald du einen EWH anlegst oder zuweist, erscheinen hier Punkteskalierung,
                        Notenschlüssel und die eigentlichen Aufgabenbereiche.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="button-primary gap-2"
                          onClick={() => setActiveTab("guidedBuilder")}
                        >
                          <PlusIcon />
                          EWH erstellen
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => setActiveTab("archive")}
                        >
                          Archiv öffnen
                        </button>
                      </div>
                    </div>
                  </Card>
                )}

                {activeWorkspace ? (
                  <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-3xl border px-4 py-3 surface-muted">
                    <div>
                      <p className="label">Abschnitte</p>
                      <p className="themed-muted text-sm">
                        {displayExam.sections.length} Bereiche · {displayExam.sections.reduce((sum, section) => sum + section.tasks.length, 0)} Unteraufgaben
                      </p>
                    </div>
                    <div className="control-cluster inline-flex flex-wrap items-center gap-1 rounded-full border p-1">
                      <button
                        type="button"
                        className="button-secondary gap-2 px-3 py-2 text-xs"
                        onClick={() => setCollapsedSectionIds(displayExam.sections.map((section) => section.id))}
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                        Alle zuklappen
                      </button>
                      <button
                        type="button"
                        className="button-secondary gap-2 px-3 py-2 text-xs"
                        onClick={() => setCollapsedSectionIds([])}
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                        Alle aufklappen
                      </button>
                    </div>
                  </div>
                ) : null}

                {activeWorkspace && displayExam.sections.map((section, index) => {
                  const nextSection = displayExam.sections[index + 1];
                  const isLinkedLead = isLinkedSectionLeader(displayExam.sections, index);

                  if (isLinkedSectionFollower(displayExam.sections, index)) {
                    return null;
                  }

                  const renderSectionEditor = (entry: typeof section, entryIndex: number) => (
                    <div
                      key={entry.id}
                      id={getEditorSectionAnchorId(entry.id)}
                      data-editor-anchor={getEditorSectionAnchorId(entry.id)}
                      className="scroll-mt-24"
                    >
                      <SectionEditor
                        section={entry}
                        index={entryIndex}
                        targetPointsFromWeight={sectionPointTargets.get(entry.id) ?? null}
                        draggable
                        isDragging={draggedSectionId === entry.id}
                        collapsed={collapsedSectionIds.includes(entry.id)}
                        dropIndicatorPosition={sectionDropIndicator?.targetSectionId === entry.id ? sectionDropIndicator.position : null}
                        onDragStart={() => {
                          setDraggedSectionId(entry.id);
                          setSectionDropIndicator(null);
                        }}
                        onDragEnd={() => {
                          setDraggedSectionId(null);
                          setSectionDropIndicator(null);
                        }}
                        onDragOver={handleDragOverSection}
                        onDrop={handleDropSection}
                        onChange={(patch) => updateSection(entry.id, patch)}
                        onWeightChange={(value) => rebalanceSectionWeight(entry.id, value)}
                        onTotalPointsChange={(value) => requestSectionTotalChange(entry.id, value)}
                        onToggleCollapse={() =>
                          setCollapsedSectionIds((current) =>
                            current.includes(entry.id)
                              ? current.filter((id) => id !== entry.id)
                              : [...current, entry.id],
                          )
                        }
                        onTaskChange={(taskId, patch) => updateTask(entry.id, taskId, patch)}
                        scoresLocked={assessmentLocked}
                        onAddTask={() => updateSection(entry.id, { tasks: [...exam.sections[entryIndex].tasks, createTask()] })}
                        onDelete={() => setSectionToDelete(exam.sections[entryIndex])}
                        onDuplicate={() => duplicateSection(entry.id)}
                        onMove={(direction) => moveSection(entry.id, direction)}
                        linkedSectionTitle={
                          (() => {
                            const partnerIndex = getLinkedSectionPartnerIndex(displayExam.sections, entryIndex);
                            return partnerIndex === -1 ? null : displayExam.sections[partnerIndex]?.title ?? null;
                          })()
                        }
                        linkTargetTitle={
                          displayExam.sections[entryIndex + 1] && !displayExam.sections[entryIndex + 1]?.linkedSectionId
                            ? displayExam.sections[entryIndex + 1]?.title ?? null
                            : displayExam.sections[entryIndex - 1] && !displayExam.sections[entryIndex - 1]?.linkedSectionId
                              ? displayExam.sections[entryIndex - 1]?.title ?? null
                              : null
                        }
                        onToggleLink={() => toggleSectionLink(entry.id)}
                        onDeleteTask={(taskId) =>
                          updateSection(entry.id, {
                            tasks: exam.sections[entryIndex].tasks.filter((task) => task.id !== taskId),
                          })
                        }
                        onDuplicateTask={(taskId) => duplicateTask(entry.id, taskId)}
                        onMoveTask={(taskId, direction) => {
                          const taskIndex = exam.sections[entryIndex].tasks.findIndex((task) => task.id === taskId);
                          updateSection(entry.id, {
                            tasks: reorder(
                              exam.sections[entryIndex].tasks,
                              taskIndex,
                              direction === "up" ? taskIndex - 1 : taskIndex + 1,
                            ),
                          });
                        }}
                      />
                    </div>
                  );

                  if (!isLinkedLead) {
                    return renderSectionEditor(section, index);
                  }

                  return (
                    <div
                      key={`linked-block-${section.id}`}
                      className="linked-section-block rounded-[32px] border p-4 shadow-sm"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
                        <div>
                          <p className="linked-section-kicker text-xs font-semibold uppercase tracking-[0.18em]">
                            Verknüpfter Abschnittsblock
                          </p>
                          <p className="subsection-copy mt-1 text-sm">
                            Beide Abschnitte werden zusammen dargestellt, bleiben in der Berechnung aber getrennt.
                          </p>
                        </div>
                        <div className="linked-section-chip rounded-full px-3 py-1 text-xs font-semibold">
                          Verknüpft
                        </div>
                      </div>
                      <div className="space-y-4">
                        {renderSectionEditor(section, index)}
                        {nextSection && renderSectionEditor(nextSection, index + 1)}
                      </div>
                    </div>
                  );
                })}

                {activeWorkspace ? (
                  <>
                    <div className="no-print">
                      <button
                        type="button"
                        className="button-primary gap-2"
                        onClick={() => updateExam({ sections: [...exam.sections, createSection()] })}
                      >
                        <PlusIcon />
                        Abschnitt manuell ergänzen
                      </button>
                    </div>

                    <div className="my-8 flex justify-center">
                      <hr className="section-divider w-[90%]" />
                    </div>

                    <div id={EDITOR_RESULT_ANCHOR_ID} className="scroll-mt-24">
                      <Card
                        title="Ergebnis und Abschlussbereich"
                        subtitle="Gesamtergebnis, Notenübersicht und der Bereich für Kommentar und Unterschrift als eigener Abschnitt."
                      >
                        <ReportSummarySection
                          exam={displayExam}
                          summary={summary}
                          teacherComment={activeAssessment?.teacherComment ?? ""}
                          commentPreview={resolvedTeacherCommentPreview}
                          signatureDataUrl={activeSignatureDataUrl}
                          onTeacherCommentChange={
                            activeStudentRecord && (!activeGroup?.passwordVerifier || Boolean(activeGroupPassword))
                              ? handleTeacherCommentChange
                              : undefined
                          }
                          onSignatureChange={
                            activeStudentRecord && (!activeGroup?.passwordVerifier || Boolean(activeGroupPassword))
                              ? handleSignatureChange
                              : undefined
                          }
                        />
                      </Card>
                    </div>
                  </>
                ) : null}
              </>
            )}
            </div>

            <div
              id={getTabPanelId("archive")}
              role="tabpanel"
              aria-labelledby={getTabButtonId("archive")}
              hidden={activeTab !== "archive"}
              tabIndex={0}
              className="space-y-6"
            >
            {activeTab === "archive" && (
              <Suspense
                fallback={(
                  <Card title="Archiv lädt" subtitle="Die Archivansicht wird bei Bedarf nachgeladen.">
                    <div className="surface-muted rounded-3xl p-5">
                      <p className="themed-muted text-sm leading-6">
                        Das Archiv-Dashboard wird vorbereitet.
                      </p>
                    </div>
                  </Card>
                )}
              >
                <ExpectationArchiveDashboard
                  entries={archiveEntries}
                  studentDatabase={studentDatabase}
                  workspaces={draftBundle.workspaces}
                  onOpen={openArchiveEntryInBuilder}
                  onDuplicateToBuilder={duplicateArchiveEntryToBuilder}
                  onAssignCopyToGroup={assignArchiveEntryCopyToGroup}
                  onDelete={(entry) => setArchiveEntryToDelete(entry)}
                />
              </Suspense>
            )}
            </div>

            <div
              id={getTabPanelId("backup")}
              role="tabpanel"
              aria-labelledby={getTabButtonId("backup")}
              hidden={activeTab !== "backup"}
              tabIndex={0}
              className="space-y-6"
            >
            {activeTab === "backup" && (
              <BackupPanel
                backupStatus={backupStatus}
                lastBackupAt={lastBackupAt}
                schoolYearOptions={schoolYearBackupOptions}
                totalSnapshotCount={totalSnapshotCount}
                canRollbackImport={Boolean(restoreCheckpoint)}
                onExportFullBackup={handleExportDatabase}
                onImportBackup={handleImportDatabase}
                onRollbackImport={rollbackLastImport}
                onArchiveSchoolYear={handleArchiveSchoolYear}
                onStartSchoolYear={handleStartSchoolYear}
              />
            )}
            </div>

            {activeTab === "builder" && activeWorkspace && (
              <div className="no-print">
                <ImportExportControls
                  onImportBackup={handleImportDatabase}
                  onExportBackup={handleExportDatabase}
                  onPrint={handlePrint}
                  onExportDocx={handleExportDocx}
                  onExportClassDocx={activeGroup ? handleExportClassDocx : undefined}
                  onExportClassOverviewDocx={activeGroup && classOverview ? handleExportClassOverviewDocx : undefined}
                  onExportEmptyDocx={handleExportEmptyDocx}
                  onExportGradeScaleDocx={handleExportGradeScaleDocx}
                  onPrintWithoutDetails={handlePrintWithoutDetails}
                  onPrintGradeScale={handlePrintGradeScale}
                  onPrintClass={activeGroup ? handlePrintClass : undefined}
                  onPrintClassOverview={activeGroup && classOverview ? handlePrintClassOverview : undefined}
                  onExportCsvStudent={handleExportStudentCsv}
                  onExportCsvClass={activeGroup ? () => void handleExportClassCsv() : undefined}
                  onExportCsvClassOverview={activeGroup && classOverview ? handleExportClassOverviewCsv : undefined}
                  onExportCsvGradeScale={handleExportGradeScaleCsv}
                  onExportScoringCsv={handleExportScoringCsv}
                  onExportScoringOds={handleExportScoringOds}
                  onExportScoringXlsx={handleExportScoringXlsx}
                  printLabel={printLabel}
                  printWithoutDetailsLabel={printWithoutDetailsLabel}
                  printGradeScaleLabel={printGradeScaleLabel}
                  classPrintLabel={classPrintLabel}
                  classOverviewPrintLabel={classOverviewPrintLabel}
                  exportCsvStudentLabel={exportCsvStudentLabel}
                  exportCsvClassLabel={exportCsvClassLabel}
                  exportCsvClassOverviewLabel={exportCsvClassOverviewLabel}
                  exportCsvGradeScaleLabel={exportCsvGradeScaleLabel}
                  exportScoringCsvLabel={exportScoringCsvLabel}
                  exportScoringOdsLabel={exportScoringOdsLabel}
                  exportScoringXlsxLabel={exportScoringXlsxLabel}
                  printHint={printHint}
                />
              </div>
            )}
          </main>

          {activeTab !== "guidedBuilder" && activeTab !== "home" ? (
            <aside className="space-y-6 xl:sticky xl:top-6 self-start">
              <SummaryPanel
                summary={summary}
                studentLabel={activeStudentLiveLabel}
                studentLabelTitle={activeStudentLiveLabelTitle}
                locked={assessmentLocked}
                correctionCoverage={correctionCompletionState.key ? correctionCompletionState : null}
              />
              {activeTab === "builder" && activeWorkspace ? (
                <EditorToc
                  sections={displayExam.sections}
                  showPointSubsections={!pointsAndGradeSectionCollapsed}
                />
              ) : null}
              {!assessmentLocked && classOverview ? <ClassOverviewPanel overview={classOverview} /> : null}
            </aside>
          ) : null}
        </div>
        <AppFooter />
      </div>

      <ConfirmDialog
        open={quickBackupDialogOpen}
        title="Backup jetzt erstellen"
        description="Das Backup wird mit diesem Passwort verschlüsselt. Anschließend wählst du nur noch den Speicherort für die Datei aus."
        onCancel={() => {
          if (quickBackupSaving) return;
          setQuickBackupDialogOpen(false);
          setQuickBackupPassphrase("");
          setQuickBackupError("");
        }}
        onConfirm={() => {
          void createQuickBackup();
        }}
        confirmLabel={quickBackupSaving ? "Backup wird erstellt …" : "Backup erstellen"}
        cancelDisabled={quickBackupSaving}
        confirmDisabled={quickBackupSaving}
      >
        <Field label="Backup-Passwort" inputId="quick-backup-passphrase">
          <input
            id="quick-backup-passphrase"
            className="field"
            type="password"
            autoComplete="new-password"
            value={quickBackupPassphrase}
            disabled={quickBackupSaving}
            onChange={(event) => {
              setQuickBackupPassphrase(event.target.value);
              if (quickBackupError) setQuickBackupError("");
            }}
          />
        </Field>
        {quickBackupError ? <p className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300" role="alert">{quickBackupError}</p> : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingImportPreview !== null}
        title={
          pendingImportPreview?.kind === "app-backup" || pendingImportPreview?.kind === "student-database-backup"
            ? "Wiederherstellung bestätigen"
            : "Import prüfen"
        }
        description={
          pendingImportPreview?.warning
            ? `${pendingImportPreview.summary}\n\nWarnung: ${pendingImportPreview.warning}${pendingImportPreview.kind === "student-database-backup" ? "\n\nDie aktuelle Schülerdatenbank wird ersetzt." : ""}`
            : `${pendingImportPreview?.summary ?? ""}${pendingImportPreview?.kind === "app-backup" ? "\n\nDer aktuelle Arbeitsstand wird vollständig ersetzt." : pendingImportPreview?.kind === "student-database-backup" ? "\n\nDie aktuelle Schülerdatenbank wird ersetzt." : ""}`
        }
        onCancel={dismissImportPreview}
        onConfirm={confirmImportPreview}
        onSaveAndConfirm={
          pendingImportPreview?.kind === "app-backup" || pendingImportPreview?.kind === "student-database-backup"
            ? () => {
                void saveCurrentBackupThenConfirmImport();
              }
            : undefined
        }
        saveAndConfirmLabel="Vorher speichern und wiederherstellen"
        confirmLabel={
          pendingImportPreview?.kind === "app-backup" || pendingImportPreview?.kind === "student-database-backup"
            ? "Ersetzen und wiederherstellen"
            : "Import übernehmen"
        }
        cancelDisabled={preRestoreBackupSaving}
        confirmDisabled={
          preRestoreBackupSaving ||
          ((pendingImportPreview?.kind === "app-backup" || pendingImportPreview?.kind === "student-database-backup") &&
            !restoreOverwriteConfirmed)
        }
      >
        <div className="dialog-preview rounded-2xl p-4">
          <p className="label">Datei</p>
          <p className="themed-strong text-sm font-medium">{pendingImportPreview?.sourceLabel}</p>
          {pendingImportPreview?.kind === "app-backup" ? (
            <p className="mt-3 text-sm" style={{ color: "var(--app-text)" }}>
              Der aktuelle Arbeitsstand wird vollständig ersetzt. Ein lokaler Rollback-Punkt wird erstellt. Mit „Vorher speichern“ wird zusätzlich eine verschlüsselte Datei angelegt; nur danach wird die Wiederherstellung ausgeführt.
            </p>
          ) : pendingImportPreview?.kind === "schoolyear-workspace-archive" ? (
            <p className="mt-3 text-sm" style={{ color: "var(--app-text)" }}>
              Die Klassenarbeiten aus dem Schuljahr-Archiv werden zur aktuellen Arbeitsliste hinzugefügt. Das bestehende EWH-Archiv bleibt unverändert.
            </p>
          ) : (
            <p className="mt-3 text-sm" style={{ color: "var(--app-text)" }}>
              Klassenarbeiten und Archiv bleiben erhalten. Die Schülerdatenbank wird ersetzt und ein lokaler Rollback-Punkt erstellt. Mit „Vorher speichern“ wird zusätzlich eine verschlüsselte Datei angelegt.
            </p>
          )}
          {pendingImportPreview?.kind === "app-backup" || pendingImportPreview?.kind === "student-database-backup" ? (
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 text-sm leading-5" htmlFor="restore-overwrite-confirmation">
                <input
                  id="restore-overwrite-confirmation"
                  type="checkbox"
                  checked={restoreOverwriteConfirmed}
                  disabled={preRestoreBackupSaving}
                  onChange={(event) => setRestoreOverwriteConfirmed(event.target.checked)}
                />
                <span>Ich verstehe, dass bestehende lokale Daten ersetzt werden.</span>
              </label>
              <Field label="Passwort für optionale Vorab-Sicherung" inputId="pre-restore-backup-passphrase">
                <input
                  id="pre-restore-backup-passphrase"
                  className="field"
                  type="password"
                  value={preRestoreBackupPassphrase}
                  disabled={preRestoreBackupSaving}
                  onChange={(event) => {
                    setPreRestoreBackupPassphrase(event.target.value);
                    if (preRestoreBackupError) setPreRestoreBackupError("");
                  }}
                />
              </Field>
              {preRestoreBackupError ? <p className="text-sm font-medium" role="alert">{preRestoreBackupError}</p> : null}
            </div>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingSecurityTokenCards.length > 0}
        title="Security-Token sichern"
        description="Das generierte Token wird nicht dauerhaft im Klartext gespeichert. Drucke oder kopiere es jetzt und bewahre es getrennt von Schülerlisten auf."
        onCancel={() => setPendingSecurityTokenCards([])}
        onConfirm={handlePrintSecurityTokens}
        confirmLabel="Druckkarte öffnen und schließen"
      >
        <div className="space-y-3">
          {pendingSecurityTokenCards.map((entry) => (
            <div key={entry.groupId} className="surface-muted rounded-2xl p-4">
              <p className="label">Lerngruppe</p>
              <p className="themed-strong text-base font-semibold">{entry.subject} · {entry.className}</p>
              <p className="themed-muted mt-1 text-xs">Gruppen-ID: {entry.groupId}</p>
              <div className="surface-elevated mt-3 rounded-2xl border p-4">
                <p className="label">Security-Token</p>
                <p className="themed-strong text-lg font-semibold tracking-[0.18em]" style={{ fontFamily: "\"Courier New\", monospace" }}>
                  {entry.token}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={headerUnlockDialogOpen}
        title="Klassenpasswort eingeben"
        description="Nach erfolgreicher Prüfung werden Bewertungsdaten, Kommentare, Signaturen und Klarnamen dieser Lerngruppe nur lokal für die aktuelle Sitzung geladen."
        onCancel={() => {
          if (headerUnlockLoading) return;
          setHeaderUnlockDialogOpen(false);
          setHeaderUnlockPasswordInput("");
          setHeaderUnlockError("");
          setHeaderUnlockLoading(false);
        }}
        onConfirm={async () => {
          if (headerUnlockLoading) return;
          if (!activeGroup) return;
          const password = headerUnlockPasswordInput.trim();
          if (!password) {
            setHeaderUnlockError("Bitte gib das Klassenpasswort ein.");
            return;
          }

          setHeaderUnlockLoading(true);
          setHeaderUnlockError("");
          try {
            const unlocked = await handleUnlockGroup(activeGroup.id, password, { silent: true });
            if (!unlocked) {
              setHeaderUnlockError("Das Klassenpasswort ist falsch.");
              return;
            }

            setHeaderUnlockDialogOpen(false);
            setHeaderUnlockPasswordInput("");
            setHeaderUnlockError("");
            pushNotice(
              "success",
              "Lerngruppe entschlüsselt",
              "Bewertungen, Kommentare und Namen wurden lokal für diese Sitzung geladen.",
            );
          } finally {
            setHeaderUnlockLoading(false);
          }
        }}
        confirmLabel={headerUnlockLoading ? "Wird geladen..." : "Lerngruppe entschlüsseln"}
        cancelDisabled={headerUnlockLoading}
        confirmDisabled={headerUnlockLoading}
      >
        <div className="dialog-preview rounded-2xl p-4">
          <Field
            as="div"
            label={`Passwort für ${activeGroup?.subject ?? "Klasse"} · ${activeGroup?.className ?? ""}`}
            inputId="header-unlock-password"
          >
            <input
              id="header-unlock-password"
              className="field"
              type="password"
              value={headerUnlockPasswordInput}
              disabled={headerUnlockLoading}
              onChange={(event) => {
                setHeaderUnlockPasswordInput(event.target.value);
                if (headerUnlockError) {
                  setHeaderUnlockError("");
                }
              }}
            />
          </Field>
          {headerUnlockLoading ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border p-3 text-sm font-semibold" role="status" aria-live="polite">
              <LoadingIcon className="h-5 w-5 animate-spin" />
              <span>Bewertungsdaten werden entschlüsselt. Bitte Fenster nicht schließen.</span>
            </div>
          ) : null}
          {headerUnlockError ? (
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--app-soft-text)" }}>
              {headerUnlockError}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={printPasswordDialogOpen}
        title="Klassenpasswort eingeben"
        description="Für den Druck mit Klarname wird das Passwort der ausgewählten Klasse lokal abgefragt. Nach erfolgreicher Prüfung bleibt es für diese Sitzung verfügbar."
        onCancel={() => {
          setPrintPasswordDialogOpen(false);
          setPrintPasswordInput("");
          setPendingPrintMode(null);
        }}
        onConfirm={async () => {
          const password = printPasswordInput;
          const successPassword = password.trim();
          if (!successPassword) return;
          const printed = pendingPrintMode === "class"
            ? await printWholeClassWithResolvedIdentity(successPassword)
            : await printWithResolvedIdentity(successPassword);
          if (printed) {
            if (activeGroup?.passwordVerifier) {
              unlockedGroupPasswordsRef.current = { ...unlockedGroupPasswordsRef.current, [activeGroup.id]: successPassword };
              setUnlockedGroupIds((current) => (current.includes(activeGroup.id) ? current : [...current, activeGroup.id]));
              const hydratedDatabase = await hydrateSensitiveAssessmentsForGroup(studentDatabaseRef.current, activeGroup.id, successPassword);
              setStudentDatabase(hydratedDatabase);
            }
            setPrintPasswordDialogOpen(false);
            setPrintPasswordInput("");
            setPendingPrintMode(null);
          }
        }}
        confirmLabel="Entschlüsseln und drucken"
      >
        <div className="dialog-preview rounded-2xl p-4">
          <label className="block">
            <span className="label">Passwort für {activeGroup?.subject} · {activeGroup?.className}</span>
            <input
              className="field"
              type="password"
              value={printPasswordInput}
              onChange={(event) => setPrintPasswordInput(event.target.value)}
            />
          </label>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={templateToLoad !== null}
        title="Vorlage laden"
        description={
          templateToLoad?.target === "current"
            ? "Möchtest du diese Vorlage in die aktuell geöffnete Klassenarbeit übernehmen?\nDie bestehende Struktur dieser Klassenarbeit wird ersetzt."
            : "Möchtest du aus dieser Vorlage eine neue Klassenarbeit anlegen?\nDie aktuelle Klassenarbeit bleibt erhalten und die Vorlage wird als neuer Workspace geöffnet."
        }
        onCancel={() => setTemplateToLoad(null)}
        onConfirm={() =>
          templateToLoad &&
          applyTemplate(
            templateToLoad.template,
            templateToLoad.target,
            templateToLoad.gradeScale,
            templateToLoad.meta,
            templateToLoad.targetGroupId,
            templateToLoad.targetTotalPoints,
          )
        }
        onSaveAndConfirm={() => {
          trackLocalSave(saveDraft(draftBundle));
          if (templateToLoad) {
            applyTemplate(
              templateToLoad.template,
              templateToLoad.target,
              templateToLoad.gradeScale,
              templateToLoad.meta,
              templateToLoad.targetGroupId,
              templateToLoad.targetTotalPoints,
            );
          }
        }}
        confirmLabel="Vorlage laden"
      >
        {templateToLoad && (
          <div className="dialog-preview rounded-2xl p-4 text-sm">
            <strong>{templateToLoad.template.title}</strong>
            <p className="mt-2">{templateToLoad.template.description}</p>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={sectionToDelete !== null}
        title="Abschnitt löschen"
        description="Möchtest du diesen Abschnitt wirklich löschen? Alle Punkte, Unteraufgaben und Erwartungshorizonte dieses Bereichs werden entfernt."
        onCancel={() => setSectionToDelete(null)}
        onConfirm={() => {
          if (sectionToDelete) deleteSectionNow(sectionToDelete.id);
          setSectionToDelete(null);
        }}
        confirmLabel="Abschnitt löschen"
      >
        {sectionToDelete && (
          <div className="dialog-preview rounded-2xl p-4 text-sm">
            <strong>{sectionToDelete.title}</strong>
            <p className="mt-2">{sectionToDelete.description || "Ohne Beschreibung"}</p>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={workspaceToDelete !== null}
        title="Klassenarbeit löschen"
        description="Möchtest du die aktuell ausgewählte Klassenarbeit wirklich löschen? Dieser Workspace verschwindet aus den Pills und kann nicht automatisch wiederhergestellt werden."
        onCancel={() => setWorkspaceToDelete(null)}
        onConfirm={() => {
          if (workspaceToDelete) {
            handleRemoveWorkspace(workspaceToDelete.id);
          }
          setWorkspaceToDelete(null);
        }}
        confirmLabel="Klassenarbeit löschen"
      >
        {workspaceToDelete && (
          <div className="dialog-preview rounded-2xl p-4 text-sm">
            <strong>{workspaceToDelete.label}</strong>
            <p className="mt-2">{workspaceToDelete.exam.meta.title || "Ohne Titel"}</p>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={groupToDelete !== null}
        title="Lerngruppe löschen"
        description={
          groupToDelete
            ? `Möchtest du die Lerngruppe „${groupToDelete.label}“ wirklich löschen?\n\nDabei werden ${groupToDelete.studentCount} Schülercodes aus dieser Lerngruppe sowie alle zugehörigen Bewertungen, Kommentare und Druckmarkierungen entfernt.`
            : ""
        }
        onCancel={() => setGroupToDelete(null)}
        onConfirm={() => {
          if (groupToDelete) {
            handleRemoveGroup(groupToDelete.id);
          }
          setGroupToDelete(null);
        }}
        confirmLabel="Lerngruppe löschen"
      />

      <ConfirmDialog
        open={pendingSectionTotalChange !== null}
        title="Abschnittspunkte anpassen"
        description="Diese Änderung skaliert die Maximalpunkte aller Aufgaben in diesem Abschnitt proportional. Dadurch ändert sich auch die Gesamtpunktzahl der Klassenarbeit. Möchtest du das wirklich anwenden?"
        onCancel={() => setPendingSectionTotalChange(null)}
        onConfirm={() => {
          if (pendingSectionTotalChange) {
            scaleSectionTotal(pendingSectionTotalChange.sectionId, pendingSectionTotalChange.targetTotal);
          }
          setPendingSectionTotalChange(null);
        }}
        confirmLabel="Punkte anpassen"
      >
        {pendingSectionTotalChange && (
          <div className="dialog-preview rounded-2xl p-4 text-sm">
            <strong>{pendingSectionTotalChange.sectionTitle}</strong>
            <p className="mt-2">
              Abschnitt: {formatNumber(pendingSectionTotalChange.currentTotal)} P. {"->"} {formatNumber(pendingSectionTotalChange.targetTotal)} P.
            </p>
            <p className="mt-2">
              Differenz in der Gesamtpunktzahl: {formatNumber(pendingSectionTotalChange.targetTotal - pendingSectionTotalChange.currentTotal)} P.
            </p>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingTaskMaxPointsChange !== null}
        title="Aufgabenpunkte anpassen"
        description="Die Maximalpunktzahl dieser Aufgabe wird geändert. Bestehende Schülerpunkte werden nur dann proportional angepasst, wenn du die Option unten ausdrücklich aktivierst."
        onCancel={() => {
          setPendingTaskMaxPointsChange(null);
          setScalePendingTaskScores(false);
        }}
        onConfirm={() => applyPendingTaskMaxPointsChange(scalePendingTaskScores)}
        confirmLabel="Änderung anwenden"
      >
        {pendingTaskMaxPointsChange && (
          <div className="dialog-preview space-y-4 rounded-2xl p-4 text-sm">
            <div>
              <strong>{pendingTaskMaxPointsChange.taskTitle}</strong>
              <p className="mt-2">
                Lerngruppe: {pendingTaskMaxPointsChange.groupLabel}
              </p>
              <p className="mt-2">
                Aufgabe: {formatNumber(pendingTaskMaxPointsChange.currentMaxPoints)} P. {"->"} {formatNumber(pendingTaskMaxPointsChange.targetMaxPoints)} P.
              </p>
              <p className="mt-2">
                Bereits erfasste Bewertungen für diese Aufgabe: {pendingTaskMaxPointsChange.affectedStudentCount}
              </p>
            </div>
            <Field label="Bestehende Schülerpunkte" as="div">
              <label className="flex items-start gap-3 rounded-2xl border px-4 py-3">
                <input
                  type="checkbox"
                  checked={scalePendingTaskScores}
                  onChange={(event) => setScalePendingTaskScores(event.target.checked)}
                />
                <span className="text-sm leading-6">
                  Punkte proportional anpassen. Beispiel: 8/10 wird zu 9,5/12.
                  Ohne Häkchen bleiben die vorhandenen Schülerpunkte unverändert.
                </span>
              </label>
            </Field>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingVersionRestore !== null}
        title="Version wiederherstellen"
        description="Möchtest du diese ältere Version wirklich wiederherstellen? Der aktuelle Stand wird vorher selbst als neue Version gesichert."
        onCancel={() => setPendingVersionRestore(null)}
        onConfirm={() => {
          if (pendingVersionRestore) {
            restoreWorkspaceVersion(pendingVersionRestore);
          }
        }}
        confirmLabel="Version wiederherstellen"
      >
        {pendingVersionRestore && (
          <div className="dialog-preview rounded-2xl p-4 text-sm">
            <strong>{pendingVersionRestore.workspaceLabel}</strong>
            <p className="mt-2">Version vom {formatDateTime(pendingVersionRestore.version.savedAt)}</p>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={archiveEntryToDelete !== null}
        title="Archiv-Eintrag löschen"
        description="Möchtest du diesen Erwartungshorizont wirklich aus dem Archiv löschen? Dieser Schritt kann nicht automatisch rückgängig gemacht werden."
        onCancel={() => setArchiveEntryToDelete(null)}
        onConfirm={() => {
          if (archiveEntryToDelete) {
            setArchiveEntries((current) => {
              const next = current.filter((entry) => entry.id !== archiveEntryToDelete.id);
              trackLocalSave(saveExpectationArchive(next));
              return next;
            });
          }
          setArchiveEntryToDelete(null);
        }}
        confirmLabel="Archiv-Eintrag löschen"
      >
        {archiveEntryToDelete && (
          <div className="dialog-preview rounded-2xl p-4 text-sm">
            <strong>{archiveEntryToDelete.examTitle}</strong>
            <p className="mt-2">{archiveEntryToDelete.summaryText}</p>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingArchiveOverwrite !== null}
        title="Archiv-Eintrag überschreiben"
        description="Es existiert bereits ein Archiv-Eintrag mit demselben Vorlagenamen. Möchtest du den vorhandenen Eintrag überschreiben?"
        onCancel={() => setPendingArchiveOverwrite(null)}
        onConfirm={() => {
          if (pendingArchiveOverwrite) {
            persistArchiveEntry(pendingArchiveOverwrite.incoming, pendingArchiveOverwrite.existing.id);
          }
          setPendingArchiveOverwrite(null);
        }}
        confirmLabel="Überschreiben"
      >
        {pendingArchiveOverwrite && (
          <div className="dialog-preview rounded-2xl p-4 text-sm">
            <strong>{pendingArchiveOverwrite.existing.examTitle}</strong>
            <p className="mt-2">Vorhanden im Archiv: {pendingArchiveOverwrite.existing.summaryText}</p>
          </div>
        )}
      </ConfirmDialog>
    </AppShell>
  );
}

export default App;
