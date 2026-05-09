import { CSSProperties, KeyboardEvent, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
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
import { ExamTemplateDefinition, examTemplates } from "./data/templates";
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
} from "./utils/storage";
import {
  buildAppBackupFilenameForClass,
  clearBackupComplete,
  createEncryptedAppBackup,
  describeBackupStatus,
  isEncryptedAppBackup,
  isEncryptedStudentDatabaseBackup,
  loadLastBackupAt,
  markBackupComplete,
  parseAppBackup,
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
  markStudentPrinted,
  removeStudentGroup,
  removeStudentFromGroup,
  scrubSensitiveAssessmentsForGroups,
  scaleTaskScoresForStudents,
  setStudentOrderInGroup,
  updateStudentAbsentStatus,
  updateGroupDefaultSignature,
  updateStudentScore,
  updateStudentSignature,
  updateTeacherComment,
} from "./utils/students";
import {
  downloadCsvFile,
  downloadDataFile,
  exportClassOverviewCsv,
  exportGradeScaleCsv,
  exportStudentExamCsv,
  openBatchPrintWindow,
  openClassOverviewPrintWindow,
  openGradeScalePrintWindow,
  openPrintPopupHost,
  openPrintWindow,
  openSecurityTokenPrintWindow,
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
import { ConfirmDialog } from "./components/ConfirmDialog";
import { AppFooter } from "./components/AppFooter";
import { CelebrationOverlay } from "./components/CelebrationOverlay";
import { PointScaleControl } from "./components/PointScaleControl";
import { GradeScaleRangeSection } from "./components/GradeScaleRangeSection";
import { StudentRosterPanel } from "./components/StudentRosterPanel";
import { StudentSelectionPanel } from "./components/StudentSelectionPanel";
import type { GuidedBuilderTarget, GuidedSectionDraft } from "./components/GuidedExamBuilder";
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DashboardIcon,
  FullscreenExitIcon,
  FullscreenIcon,
  GroupIcon,
  SaveIcon,
  MoonIcon,
  PaletteIcon,
  PlusIcon,
  SunIcon,
} from "./components/icons";
import { Card, DismissibleCallout, Field, IconButton } from "./components/ui";
import { SECTION_CHART_PALETTE } from "./utils/sectionChart";
import { cloneExam, createEmptyExamMeta, withExamMeta } from "./utils/exam";
import { ImportedExamSuggestion } from "./pdf/types";

const GuidedExamBuilder = lazy(async () => {
  const module = await import("./components/GuidedExamBuilder");
  return { default: module.GuidedExamBuilder };
});

const ExpectationArchiveDashboard = lazy(async () => {
  const module = await import("./components/ExpectationArchiveDashboard");
  return { default: module.ExpectationArchiveDashboard };
});

type TabId = "guidedBuilder" | "builder" | "groups" | "archive";
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
type AppNoticeTone = "info" | "warning" | "success" | "danger";
type AppNotice = {
  id: number;
  tone: AppNoticeTone;
  title: string;
  detail?: string;
};
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
    };

const UNLOCK_SESSION_TIMEOUT_MS = 1000 * 60 * 15;
const DEMO_GROUP_ID = "demo-lerngruppe-8b";
const DEMO_WORKSPACE_ID = "demo-klassenarbeit-unit-4";
const DEMO_SEED_VERSION = "student-demo-v2";
const DEMO_SEED_VERSION_KEY = "ewh-demo-seed-version";
const DEMO_TIMESTAMP = "2026-03-23T09:00:00.000Z";
const runtimeQuery = new URLSearchParams(window.location.search);
const isDemoModeEnabled = import.meta.env.VITE_APP_MODE === "demo" || runtimeQuery.get("demo") === "1";
const shouldForceDemoSeed = runtimeQuery.get("resetDemo") === "1" || runtimeQuery.get("freshDemo") === "1";

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

const TabIcon = ({ id }: { id: TabId }) => {
  switch (id) {
    case "guidedBuilder":
      return <PlusIcon />;
    case "builder":
      return <DashboardIcon />;
    case "groups":
      return <GroupIcon />;
    case "archive":
      return <ArchiveIcon />;
  }
};

const getWorkspaceDisplayLabel = (workspace: DraftWorkspace | null | undefined) =>
  workspace?.exam.meta.title.trim() || workspace?.label || "Klassenarbeit";

const tabs: { id: TabId; label: string }[] = [
  { id: "groups", label: "Lerngruppen" },
  { id: "guidedBuilder", label: "EWH-Builder" },
  { id: "builder", label: "EWH-Editor" },
  { id: "archive", label: "EWH-Archiv" },
];

const getTabButtonId = (tabId: TabId) => `app-tab-${tabId}`;
const getTabPanelId = (tabId: TabId) => `app-tabpanel-${tabId}`;

const visualThemeOptions: { value: VisualTheme; label: string }[] = [
  { value: "earth-paper", label: "Bernsteinzimmer" },
  { value: "nrw-trikolore", label: "NRW-Trikolore" },
  { value: "waldmeister-schorle", label: "Waldmeister-Schorle" },
  { value: "blaubeer-pommesbude", label: "Blaubeer-Pommesbude" },
  { value: "flieder-feierabend", label: "Flieder-Feierabend" },
  { value: "beamtensalon", label: "Beamtensalon" },
  { value: "barrierefrei", label: "Barrierefrei" },
  { value: "video-tutorial", label: "Video-Tutorial" },
];

const orbitLedConfig: ReadonlyArray<{
  angle: string;
  radius: string;
  color: string;
  delay: string;
  duration: string;
  scale?: string;
}> = [
  { angle: "0deg", radius: "8.1rem", color: "#67e8f9", delay: "-0.2s", duration: "2.6s" },
  { angle: "45deg", radius: "8.05rem", color: "#f5c86b", delay: "-1.1s", duration: "3.1s", scale: "0.9" },
  { angle: "90deg", radius: "8rem", color: "#7dd3fc", delay: "-0.6s", duration: "2.2s" },
  { angle: "135deg", radius: "8.15rem", color: "#86efac", delay: "-1.8s", duration: "3.3s", scale: "0.85" },
  { angle: "180deg", radius: "8.05rem", color: "#22d3ee", delay: "-0.9s", duration: "2.8s" },
  { angle: "225deg", radius: "8rem", color: "#f59e0b", delay: "-1.4s", duration: "2.9s", scale: "0.88" },
  { angle: "270deg", radius: "8.1rem", color: "#38bdf8", delay: "-0.4s", duration: "2.4s" },
  { angle: "315deg", radius: "8.12rem", color: "#2dd4bf", delay: "-1.6s", duration: "3.4s", scale: "0.92" },
];

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
  const createDemoDraftBundle = () => {
    const workspace = createDraftWorkspace(
      normalizeExamStructure(cloneExam(sampleExam)),
      "Demo-Klassenarbeit",
      null,
      DEMO_GROUP_ID,
    );

    return {
      activeWorkspaceId: DEMO_WORKSPACE_ID,
      workspaces: [
        {
          ...workspace,
          id: DEMO_WORKSPACE_ID,
          updatedAt: DEMO_TIMESTAMP,
        },
      ],
    };
  };
  const createDemoStudentDatabase = (workspace: DraftWorkspace): StudentDatabase => {
    const placeholderEncryptedName = {
      ciphertext: "demo",
      iv: "demo",
      salt: "demo",
    };
    const students = Array.from({ length: 25 }, (_, index) => ({
      id: `demo-student-${index + 1}`,
      alias: `Student ${index + 1}`,
      encryptedName: placeholderEncryptedName,
      isAbsent: index === 24,
      createdAt: DEMO_TIMESTAMP,
    }));
    const tasks = workspace.exam.sections.flatMap((section) => section.tasks);
    const snapScore = (value: number, maxPoints: number) =>
      Math.min(maxPoints, Math.max(0, Math.round(value * 2) / 2));
    const assessments = Object.fromEntries(
      students.slice(0, 23).map((student, studentIndex) => {
        const scoredTasks = studentIndex === 22 ? tasks.slice(0, 4) : tasks;
        const taskScores = Object.fromEntries(
          scoredTasks.map((task, taskIndex) => {
            const percentage = 0.52 + (((studentIndex + 1) * 7 + taskIndex * 5) % 43) / 100;
            return [task.id, snapScore(task.maxPoints * percentage, task.maxPoints)];
          }),
        );

        return [
          `${workspace.id}::${student.id}`,
          {
            workspaceId: workspace.id,
            studentId: student.id,
            taskScores,
            encryptedTaskScores: null,
            teacherComment:
              studentIndex === 22
                ? "Demo-Kommentar: Diese Korrektur ist absichtlich nur teilweise ausgefüllt, damit der Status \"in Arbeit\" sichtbar wird."
                : "Demo-Kommentar: {alias} zeigt nachvollziehbare Leistungen. Die Rückmeldung kann direkt angepasst, gedruckt oder exportiert werden.",
            signatureDataUrl: null,
            encryptedTeacherComment: null,
            encryptedSignatureDataUrl: null,
            updatedAt: DEMO_TIMESTAMP,
            printedAt: null,
          },
        ];
      }),
    );

    return {
      version: 1,
      groups: [
        {
          id: DEMO_GROUP_ID,
          subject: "Englisch",
          className: "8b Demo",
          passwordVerifier: null,
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
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => loadVisualTheme());
  const [isAppFullscreen, setIsAppFullscreen] = useState(false);
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string>("");
  const [activeStudentId, setActiveStudentId] = useState<string>("");
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<StorageErrorState | null>(null);
  const [appNotice, setAppNotice] = useState<AppNotice | null>(null);
  const unlockedGroupPasswordsRef = useRef<Record<string, string>>({});
  const [unlockedGroupIds, setUnlockedGroupIds] = useState<string[]>([]);
  const unlockActivityAtRef = useRef<number>(Date.now());
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => loadLastBackupAt());
  const [restoreCheckpoint, setRestoreCheckpoint] = useState<RestoreCheckpoint | null>(null);
  const [pendingImportPreview, setPendingImportPreview] = useState<PendingImportPreview | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("builder");
  const tabButtonRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    groups: null,
    guidedBuilder: null,
    builder: null,
    archive: null,
  });
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
  const [pendingSecurityTokenCards, setPendingSecurityTokenCards] = useState<SecurityTokenCard[]>([]);
  const [showGradeScaleEditor, setShowGradeScaleEditor] = useState(false);
  const [pointsAndGradeSectionCollapsed, setPointsAndGradeSectionCollapsed] = useState(false);
  const [versionListCollapsed, setVersionListCollapsed] = useState(true);
  const [confettiBurstKey, setConfettiBurstKey] = useState(0);
  const completedCorrectionCelebrationKeysRef = useRef<Record<string, boolean>>({});
  const lastVersionedExamByWorkspaceRef = useRef<Record<string, string>>({});
  const previousActiveGroupIdRef = useRef<string>("");

  const pushNotice = (tone: AppNoticeTone, title: string, detail?: string) => {
    setAppNotice({
      id: Date.now(),
      tone,
      title,
      detail,
    });
  };

  const clearUnlockedGroups = (notice?: { title: string; detail?: string; tone?: AppNoticeTone }) => {
    const lockedGroupIds = Object.keys(unlockedGroupPasswordsRef.current);
    unlockedGroupPasswordsRef.current = {};
    setUnlockedGroupIds([]);
    if (lockedGroupIds.length > 0) {
      setStudentDatabase((current) => scrubSensitiveAssessmentsForGroups(current, lockedGroupIds));
    }
    if (notice) {
      pushNotice(notice.tone ?? "warning", notice.title, notice.detail);
    }
  };

  const lockGroupSession = (groupId: string, notice?: { title: string; detail?: string; tone?: AppNoticeTone }) => {
    if (!groupId) return;

    const nextPasswords = { ...unlockedGroupPasswordsRef.current };
    if (!(groupId in nextPasswords)) return;

    delete nextPasswords[groupId];
    unlockedGroupPasswordsRef.current = nextPasswords;
    setUnlockedGroupIds((current) => current.filter((id) => id !== groupId));
    setStudentDatabase((current) => scrubSensitiveAssessmentsForGroups(current, [groupId]));

    if (notice) {
      pushNotice(notice.tone ?? "info", notice.title, notice.detail);
    }
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
        const hasDemoWorkspace = Boolean(storedDraft?.workspaces.some((workspace) => workspace.id === DEMO_WORKSPACE_ID));
        const hasDemoGroup = storedStudentDatabase.groups.some((group) => group.id === DEMO_GROUP_ID);
        const shouldSeedDemoWorkspace =
          isDemoModeEnabled && (shouldForceDemoSeed || !hasCurrentDemoSeed || !hasDemoWorkspace || !hasDemoGroup);

        const nextDraftBundle = shouldSeedDemoWorkspace ? createDemoDraftBundle() : storedDraft ?? createInitialDraftBundle();
        const nextArchiveEntries = shouldSeedDemoWorkspace ? [] : storedArchiveEntries;
        const nextStudentDatabase = shouldSeedDemoWorkspace
          ? createDemoStudentDatabase(nextDraftBundle.workspaces[0])
          : storedStudentDatabase;

        if (shouldSeedDemoWorkspace) {
          markDemoSeedCurrent();
        }

        setDraftBundle(nextDraftBundle);
        setArchiveEntries(nextArchiveEntries);
        setStudentDatabase(nextStudentDatabase);
        setActiveGroupId(nextStudentDatabase.groups[0]?.id ?? "");
        setActiveStudentId(nextStudentDatabase.groups[0]?.students[0]?.id ?? "");
        if (shouldSeedDemoWorkspace) {
          setActiveTab("groups");
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

  useEffect(() => {
    if (!storageReady) return;
    void saveDraft(draftBundle);
  }, [draftBundle, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    void saveStudentDatabase(studentDatabase, (groupId) => unlockedGroupPasswordsRef.current[groupId] ?? null);
  }, [studentDatabase, storageReady]);

  useEffect(() => {
    studentDatabaseRef.current = studentDatabase;
  }, [studentDatabase]);

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

    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

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
  const visibleWorkspaces = useMemo(
    () => draftBundle.workspaces.filter((workspace) => workspaceMatchesGroup(workspace, activeGroupId)),
    [draftBundle.workspaces, activeGroupId],
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
    () => describeBackupStatus(studentDatabase, lastBackupAt),
    [studentDatabase, lastBackupAt],
  );

  const captureRestoreCheckpoint = (): RestoreCheckpoint => ({
    draftBundle,
    archiveEntries,
    studentDatabase,
    activeGroupId,
    activeStudentId,
    lastBackupAt,
  });

  const resetDemoWorkspace = () => {
    const nextDraftBundle = createDemoDraftBundle();
    const nextArchiveEntries: ExpectationArchiveEntry[] = [];
    const nextStudentDatabase = createDemoStudentDatabase(nextDraftBundle.workspaces[0]);

    setDraftBundle(nextDraftBundle);
    setArchiveEntries(nextArchiveEntries);
    void saveExpectationArchive(nextArchiveEntries);
    markDemoSeedCurrent();
    setStudentDatabase(nextStudentDatabase);
    setActiveGroupId(nextStudentDatabase.groups[0]?.id ?? "");
    setActiveStudentId(nextStudentDatabase.groups[0]?.students[0]?.id ?? "");
    unlockedGroupPasswordsRef.current = {};
    setUnlockedGroupIds([]);
    setRestoreCheckpoint(null);
    setPendingImportPreview(null);
    setLastBackupAt(null);
    clearBackupComplete();
    setActiveTab("groups");
    pushNotice("info", "Demo-Daten wurden neu geladen.", "Der Beispieldatensatz wurde lokal zurückgesetzt.");
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
    void saveExpectationArchive(nextArchiveEntries);
    setStudentDatabase(nextStudentDatabase);
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

    if (nextLastBackupAt) {
      markBackupComplete(nextLastBackupAt);
    } else {
      clearBackupComplete();
    }
    setLastBackupAt(nextLastBackupAt);
  };

  const rollbackLastImport = () => {
    if (!restoreCheckpoint) return;

    setDraftBundle(restoreCheckpoint.draftBundle);
    setArchiveEntries(restoreCheckpoint.archiveEntries);
    void saveExpectationArchive(restoreCheckpoint.archiveEntries);
    setStudentDatabase(restoreCheckpoint.studentDatabase);
    unlockedGroupPasswordsRef.current = {};
    setUnlockedGroupIds([]);
    setActiveGroupId(restoreCheckpoint.activeGroupId);
    setActiveStudentId(restoreCheckpoint.activeStudentId);
    if (restoreCheckpoint.lastBackupAt) {
      markBackupComplete(restoreCheckpoint.lastBackupAt);
    } else {
      clearBackupComplete();
    }
    setLastBackupAt(restoreCheckpoint.lastBackupAt);
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

  const setActiveWorkspaceId = (workspaceId: string) => {
    setDraftBundle((current) => ({
      ...current,
      activeWorkspaceId: workspaceId,
    }));
    setCollapsedSectionIds([]);
  };

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

  const setActiveWorkspaceArchiveEntryId = (nextActiveArchiveEntryId: string | null) => {
    const activeWorkspaceId = activeWorkspace?.id;
    if (!activeWorkspaceId) return;

    setDraftBundle((current) => ({
      ...current,
      workspaces: current.workspaces.map((workspace) =>
        workspace.id === activeWorkspaceId
          ? { ...workspace, activeArchiveEntryId: nextActiveArchiveEntryId }
          : workspace,
      ),
    }));
  };

  const setActiveWorkspaceGroupId = (nextGroupId: string | null) => {
    const activeWorkspaceId = activeWorkspace?.id;
    if (!activeWorkspaceId) return;

    setDraftBundle((current) => ({
      ...current,
      workspaces: current.workspaces.map((workspace) =>
        workspace.id === activeWorkspaceId
          ? { ...workspace, assignedGroupId: nextGroupId }
          : workspace,
      ),
    }));
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

  const createWorkspaceLabel = (workspaces: DraftWorkspace[]) => `Klassenarbeit ${workspaces.length + 1}`;

  const addWorkspace = (
    nextExam: Exam,
    options?: { label?: string; activeArchiveEntryId?: string | null; assignedGroupId?: string | null },
  ) => {
    const normalizedExam = normalizeExamStructure(nextExam);
    const workspaceId = crypto.randomUUID();
    setDraftBundle((current) => {
      const workspace = {
        ...createDraftWorkspace(
          normalizedExam,
          options?.label ?? createWorkspaceLabel(current.workspaces),
          options?.activeArchiveEntryId ?? null,
          (options?.assignedGroupId ?? activeGroupId) || null,
        ),
        id: workspaceId,
      };
      return {
        activeWorkspaceId: workspace.id,
        workspaces: [...current.workspaces, workspace],
      };
    });
    lastVersionedExamByWorkspaceRef.current = {
      ...lastVersionedExamByWorkspaceRef.current,
      [workspaceId]: JSON.stringify(normalizedExam),
    };
    setCollapsedSectionIds([]);
  };

  const triggerExamCelebration = () => {
    setConfettiBurstKey(Date.now());
  };

  const removeWorkspace = (workspaceId: string) => {
    setDraftBundle((current) => {
      if (current.workspaces.length <= 1) return current;
      const nextWorkspaces = current.workspaces.filter((workspace) => workspace.id !== workspaceId);
      const nextActiveWorkspaceId =
        current.activeWorkspaceId === workspaceId
          ? nextWorkspaces[Math.max(0, current.workspaces.findIndex((workspace) => workspace.id === workspaceId) - 1)]?.id ?? nextWorkspaces[0]!.id
          : current.activeWorkspaceId;
      return {
        activeWorkspaceId: nextActiveWorkspaceId,
        workspaces: nextWorkspaces,
      };
    });
    const nextVersionedState = { ...lastVersionedExamByWorkspaceRef.current };
    delete nextVersionedState[workspaceId];
    lastVersionedExamByWorkspaceRef.current = nextVersionedState;
    setCollapsedSectionIds([]);
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
      void saveDraft(nextBundle);
      lastVersionedExamByWorkspaceRef.current = {
        ...lastVersionedExamByWorkspaceRef.current,
        [activeWorkspaceId]: JSON.stringify(normalizedExam),
      };
    } else {
      const workspaceId = crypto.randomUUID();
      const workspace = {
        ...createDraftWorkspace(
          normalizedExam,
          createWorkspaceLabel(draftBundle.workspaces),
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
      void saveDraft(nextBundle);
      lastVersionedExamByWorkspaceRef.current = {
        ...lastVersionedExamByWorkspaceRef.current,
        [workspaceId]: JSON.stringify(normalizedExam),
      };
      syncBuilderToGroup(assignedGroupId);
    }

    setCollapsedSectionIds([]);
    setActiveTab("builder");
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

    const { achievedPoints, ...templatePatch } = patch;
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

  const restoreWorkspaceVersion = (pendingRestore: PendingVersionRestore) => {
    setDraftBundle((current) => ({
      ...current,
      workspaces: current.workspaces.map((workspace) => {
        if (workspace.id !== pendingRestore.workspaceId) return workspace;

        const currentSnapshot: DraftWorkspaceVersion = {
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          exam: cloneExamSnapshot(workspace.exam),
        };

        return {
          ...workspace,
          exam: normalizeExamStructure(cloneExamSnapshot(pendingRestore.version.exam)),
          updatedAt: new Date().toISOString(),
          versions: [currentSnapshot, ...workspace.versions.filter((version) => version.id !== pendingRestore.version.id)]
            .slice(0, MAX_WORKSPACE_VERSIONS),
        };
      }),
    }));

    lastVersionedExamByWorkspaceRef.current = {
      ...lastVersionedExamByWorkspaceRef.current,
      [pendingRestore.workspaceId]: JSON.stringify(pendingRestore.version.exam),
    };
    setPendingVersionRestore(null);
    setCollapsedSectionIds([]);
  };

  const saveWorkspaceVersion = (workspaceId: string) => {
    setDraftBundle((current) => ({
      ...current,
      workspaces: current.workspaces.map((workspace) => {
        if (workspace.id !== workspaceId) return workspace;

        const currentVersion: DraftWorkspaceVersion = {
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          exam: cloneExamSnapshot(workspace.exam),
        };

        return {
          ...workspace,
          versions: [currentVersion, ...workspace.versions].slice(0, MAX_WORKSPACE_VERSIONS),
        };
      }),
    }));

    const workspace = draftBundle.workspaces.find((entry) => entry.id === workspaceId) ?? null;
    if (!workspace) return;

    lastVersionedExamByWorkspaceRef.current = {
      ...lastVersionedExamByWorkspaceRef.current,
      [workspaceId]: JSON.stringify(workspace.exam),
    };
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

    addWorkspace(createEditableExamFromArchive(entry, { duplicate: true }), {
      activeArchiveEntryId: entry.id,
      assignedGroupId: targetGroup.id,
    });
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
      saveExpectationArchive(merged);
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

  const handleToggleStudentAbsent = (groupId: string, studentId: string, isAbsent: boolean) => {
    setStudentDatabase((current) => updateStudentAbsentStatus(current, groupId, studentId, isAbsent));
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
      if (value === "/signature.svg") {
        let next = updateStudentSignature(current, activeWorkspace?.id ?? null, activeStudentId, null);
        next = updateGroupDefaultSignature(next, activeGroup.id, value);
        studentDatabaseRef.current = next;
        return next;
      }

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

    const backup = await createEncryptedAppBackup({
      draftBundle,
      studentDatabase,
      archiveEntries,
    }, passphrase.trim());
    downloadDataFile(buildAppBackupFilenameForClass(backup.exportedAt, activeGroup?.className ?? null), backup);
    markBackupComplete(backup.exportedAt);
    setLastBackupAt(backup.exportedAt);
    pushNotice("success", "Backup exportiert", `Verschlüsseltes Backup erstellt am ${new Date(backup.exportedAt).toLocaleString("de-DE")}.`);
    return true;
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
          pushNotice("danger", "Import fehlgeschlagen", error instanceof Error ? error.message : "Der Arbeitsstand konnte nicht importiert werden.");
        }
      })();
    };
    reader.readAsText(file);
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
      setPendingImportPreview(null);
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
    setPendingImportPreview(null);
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

    downloadCsvFile(`${activeGroup.className || "Klasse"}_Klassendaten.csv`, rows);
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
  const printHint = activeStudentRecord
    ? activeGroup?.passwordVerifier
      ? assessmentLocked
        ? "Geschützte Lerngruppe: erst entsperren, dann stehen Druck und CSV mit vollständigen Bewertungsdaten bereit."
        : "Geschützte Lerngruppe entsperrt: Druck und CSV arbeiten mit lokal entschlüsselten Bewertungsdaten."
      : "Für diese Klasse ist noch kein Passwort gesetzt. Ausdrucke und CSV-Exporte nutzen deshalb nur den Schülercode."
    : "PDF für Ausdrucke, CSV für Tabellenkalkulationen und JSON für Sicherungen.";

  const handlePrintSecurityTokens = () => {
    const opened = openSecurityTokenPrintWindow(pendingSecurityTokenCards);
    if (!opened) {
      pushNotice("warning", "Druckfenster blockiert", "Bitte erlaube Pop-ups für diese Anwendung.");
    }
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

  if (storageError) {
    return (
      <div className="min-h-screen px-4 py-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
          <section className="panel w-full p-6 sm:p-8">
            <h1 className="themed-strong text-2xl font-semibold">Lokaler Speicher nicht verfügbar</h1>
            <p className="themed-muted mt-3 text-sm leading-6">{storageError.detail}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="button-primary" onClick={() => window.location.reload()}>
                Seite neu laden
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!storageReady) {
    return (
      <div className="min-h-screen px-4 py-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1880px] items-center justify-center">
          <section className="storage-loader-shell w-full max-w-6xl">
            <div className="storage-loader-stage">
              <div className="storage-loader-orbit" aria-hidden="true">
                <div className="storage-loader-ring storage-loader-ring-primary" />
                <div className="storage-loader-ring storage-loader-ring-secondary" />
                <div className="storage-loader-ring storage-loader-ring-tertiary" />
                <div className="storage-loader-leds">
                  {orbitLedConfig.map((led) => (
                    <span
                      key={led.angle}
                      className="storage-loader-led"
                      style={
                        {
                          "--led-angle": led.angle,
                          "--led-radius": led.radius,
                          "--led-color": led.color,
                          "--led-delay": led.delay,
                          "--led-duration": led.duration,
                          "--led-scale": led.scale ?? "1",
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
                <div className="storage-loader-core">
                  <span className="storage-loader-core-text">ES</span>
                </div>
              </div>

              <div className="storage-loader-copy">
                <p className="storage-loader-kicker">Erwartungshorizont Studio</p>
                <h1 className="storage-loader-title">Lokaler Speicher wird hochgefahren</h1>
                <p className="storage-loader-text">
                  Die Anwendung initialisiert den SQLite-Speicher, prüft vorhandene Datenstände und stellt den letzten
                  Arbeitsstand wieder her.
                </p>
                <div className="storage-loader-status" role="status" aria-live="polite">
                  <span className="storage-loader-status-dot" />
                  Speicher synchronisiert
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div ref={appShellRef} className="app-shell min-h-screen px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      {confettiBurstKey > 0 ? (
        <CelebrationOverlay burstKey={confettiBurstKey} onComplete={() => setConfettiBurstKey(0)} />
      ) : null}
      <div className="mx-auto max-w-[1880px]">
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="hero-kicker mb-3">Erwartungshorizont-Studio | NRW Edition</p>
            <div className="brand-header-lockup">
              <div className="min-w-0">
                <h1 className="font-display themed-strong text-4xl md:text-5xl">
                  Erwartungshorizont Studio
                </h1>
                <p className="themed-muted mt-4 max-w-3xl text-base leading-7">
                  Erwartungshorizonte, erstellen und verwalten
                </p>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 no-print sm:flex-row sm:flex-wrap sm:items-start sm:justify-end lg:w-auto">
            <label className="block w-full sm:min-w-[220px] sm:w-auto">
              <span className="label inline-flex items-center gap-2">
                <PaletteIcon className="h-3.5 w-3.5" />
                Visual Theme
              </span>
              <select
                className="field"
                value={visualTheme}
                onChange={(event) => setVisualTheme(event.target.value as VisualTheme)}
              >
                {visualThemeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button-secondary w-full gap-2 sm:w-auto sm:self-end"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </button>
            <button
              type="button"
              className="button-secondary w-full gap-2 sm:w-auto sm:self-end"
              onClick={toggleAppFullscreen}
              disabled={!document.fullscreenEnabled}
              title={isAppFullscreen ? "App-Vollbild verlassen" : "App im Vollbild öffnen"}
              aria-label={isAppFullscreen ? "App-Vollbild verlassen" : "App im Vollbild öffnen"}
            >
              {isAppFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              {isAppFullscreen ? "Vollbild aus" : "Vollbild"}
            </button>
          </div>
        </header>

        {appNotice ? (
          <div className="mb-6 no-print">
            <DismissibleCallout tone={appNotice.tone} resetKey={appNotice.id}>
              <p className="font-semibold">{appNotice.title}</p>
              {appNotice.detail ? <p>{appNotice.detail}</p> : null}
            </DismissibleCallout>
          </div>
        ) : null}

        {isDemoModeEnabled ? (
          <div className="mb-6 no-print">
            <DismissibleCallout tone="info" resetKey={`demo-${draftBundle.activeWorkspaceId}`}>
              <p className="font-semibold">Demo-Modus aktiv</p>
              <p>
                Diese GitHub-Pages-Demo lädt beim ersten Aufruf eine lokale Beispiel-Klassenarbeit. Alle Änderungen
                bleiben nur in diesem Browser.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className="button-secondary" onClick={resetDemoWorkspace}>
                  Demo-Daten zurücksetzen
                </button>
              </div>
            </DismissibleCallout>
          </div>
        ) : null}

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
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                  className={`${activeTab === tab.id ? "button-primary" : "button-secondary"} shrink-0 gap-2 whitespace-nowrap`}
                >
                  <TabIcon id={tab.id} />
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={saveExpectationsToArchive}
              className="button-secondary ml-auto shrink-0 gap-2 whitespace-nowrap border-l pl-4"
            >
              <SaveIcon />
              Im Archiv speichern
            </button>
          </div>
        </div>

        <section className="mb-5 no-print">
          <div className="workspace-switcher-shell rounded-2xl border px-3 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 md:hidden">
                  <button
                    type="button"
                    className="workspace-mobile-trigger inline-flex min-w-0 flex-1 items-center justify-center rounded-2xl border px-3 py-2 text-sm font-medium shadow-sm transition"
                    onClick={() => activeWorkspace && setActiveWorkspaceId(activeWorkspace.id)}
                  >
                    <span className="truncate">{getWorkspaceDisplayLabel(activeWorkspace)}</span>
                  </button>
                  {visibleWorkspaces.length > 1 ? (
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Weitere Klassenarbeiten auswählen</span>
                      <select
                        className="field py-2"
                        value={draftBundle.activeWorkspaceId}
                        onChange={(event) => setActiveWorkspaceId(event.target.value)}
                      >
                        {visibleWorkspaces.map((workspace) => (
                          <option key={workspace.id} value={workspace.id}>
                            {getWorkspaceDisplayLabel(workspace)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                <div className="hidden min-w-0 overflow-x-auto md:block">
                  <div className="workspace-tabs inline-flex min-w-full items-end border-b">
                  {visibleWorkspaces.map((workspace) => (
                    <button
                      type="button"
                      key={workspace.id}
                      className={`workspace-tab -mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
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
              <div className="flex flex-wrap gap-2 md:justify-end">
              <button
                type="button"
                className="button-secondary flex-1 gap-2 sm:flex-none"
                onClick={() => setActiveTab("guidedBuilder")}
              >
                <PlusIcon />
                Neu
              </button>
              <button
                type="button"
                className="button-soft flex-1 gap-2 sm:flex-none"
                onClick={() => activeWorkspace && setWorkspaceToDelete(activeWorkspace)}
                disabled={draftBundle.workspaces.length <= 1 || !activeWorkspace}
              >
                <ArchiveIcon />
                Löschen
              </button>
              </div>
            </div>
            {hasNoAssignedWorkspaceForActiveGroup ? (
              <div className="empty-workspace-state mt-4">
                <div className="empty-workspace-scene" aria-hidden="true">
                  <p className="empty-workspace-title">Missing input</p>
                  <div className="empty-workspace-loader">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <p className="status-note text-sm leading-6">
                  Dieser Lerngruppe ist noch keine Klassenarbeit zugeordnet.
                </p>
              </div>
            ) : activeWorkspace && (
              <div className="mt-4 grid gap-3 border-t pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="surface-muted rounded-2xl p-4">
                  <p className="label">Aktuelle Klassenarbeit</p>
                  <p className="themed-strong text-sm font-semibold">{getWorkspaceDisplayLabel(activeWorkspace)}</p>
                  <p className="themed-muted mt-2 text-sm">
                    Letzte Bearbeitung: {formatDateTime(activeWorkspace.updatedAt)}
                  </p>
                </div>
                <div className="surface-muted rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="label">Versionen</p>
                      <p className="themed-muted text-sm">Lokale Wiederherstellungspunkte der aktuellen Klassenarbeit.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconButton
                        onClick={() => setVersionListCollapsed((current) => !current)}
                        title={versionListCollapsed ? "Versionen aufklappen" : "Versionen zuklappen"}
                        className="px-2.5 py-2 text-xs"
                      >
                        {versionListCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                      </IconButton>
                      <IconButton
                        onClick={() => saveWorkspaceVersion(activeWorkspace.id)}
                        title="Schnappschuss jetzt speichern"
                        className="px-2.5 py-2 text-xs"
                      >
                        <SaveIcon />
                      </IconButton>
                      <span className="themed-strong text-sm font-semibold">{activeWorkspace.versions.length} / {MAX_WORKSPACE_VERSIONS}</span>
                    </div>
                  </div>
                  {versionListCollapsed ? (
                    <p className="themed-muted mt-3 text-sm">
                      {activeWorkspace.versions.length > 0
                        ? `${activeWorkspace.versions.length} gespeicherte Schnappschüsse`
                        : "Noch keine gespeicherten Schnappschüsse"}
                    </p>
                  ) : activeWorkspace.versions.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {activeWorkspace.versions.map((version, index) => (
                        <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2">
                          <div>
                            <p className="themed-strong text-sm font-medium">Version {activeWorkspace.versions.length - index}</p>
                            <p className="themed-muted text-xs">{formatDateTime(version.savedAt)}</p>
                          </div>
                          <button
                            type="button"
                            className="button-secondary px-3 py-2 text-xs"
                            onClick={() =>
                              setPendingVersionRestore({
                                workspaceId: activeWorkspace.id,
                                workspaceLabel: getWorkspaceDisplayLabel(activeWorkspace),
                                version,
                              })
                            }
                          >
                            Wiederherstellen
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="themed-muted mt-3 text-sm">Noch keine gespeicherten Versionen vorhanden.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside>
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
              onToggleStudentAbsent={handleToggleStudentAbsent}
              onRevealGroupStudentNames={handleRevealGroupStudentNames}
              isSelectedGroupUnlocked={Boolean(activeGroupPassword)}
              activeGroupIsProtected={activeGroupIsProtected}
              securityActionLabel={activeUnlockButtonLabel}
              onToggleSecurity={handleHeaderLockToggle}
            />
          </aside>

          <main className="space-y-6">
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
                        bis du einen EWH per Wizard anlegst oder eine Vorlage zuweist.
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
                  <Card title="Wizard lädt" subtitle="Der geführte Builder wird bei Bedarf nachgeladen.">
                    <div className="surface-muted rounded-3xl p-5">
                      <p className="themed-muted text-sm leading-6">
                        Die Wizard-Oberfläche wird vorbereitet.
                      </p>
                    </div>
                  </Card>
                )}
              >
                <GuidedExamBuilder
                  groups={studentDatabase.groups.map((group) => ({
                    id: group.id,
                    subject: group.subject,
                    className: group.className,
                  }))}
                  activeGroupId={activeGroupId}
                  templates={examTemplates}
                  initialTotalPoints={summary.totalMaxPoints}
                  initialGradeScale={exam.gradeScale}
                  initialSubject={activeGroup?.subject || ""}
                  initialMeta={exam.meta}
                  initialSections={exam.sections.map((section) => ({
                    id: section.id,
                    title: section.title,
                    weight: section.weight,
                    description: section.description,
                  }))}
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
              </Suspense>
            )}
            </div>

            <div hidden={activeTab !== "builder"} className="space-y-6">
            {activeTab === "builder" && (
              <>
                {activeWorkspace ? (
                  <div id={EDITOR_POINTS_ANCHOR_ID} className="scroll-mt-24 space-y-6">
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
                          Wizard starten
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

            {activeTab === "builder" && activeWorkspace && (
              <div className="no-print">
                <ImportExportControls
                  onImportBackup={handleImportDatabase}
                  onExportBackup={handleExportDatabase}
                  onPrint={handlePrint}
                  onPrintWithoutDetails={handlePrintWithoutDetails}
                  onPrintGradeScale={handlePrintGradeScale}
                  onPrintClass={activeGroup ? handlePrintClass : undefined}
                  onPrintClassOverview={activeGroup && classOverview ? handlePrintClassOverview : undefined}
                  onExportCsvStudent={handleExportStudentCsv}
                  onExportCsvClass={activeGroup ? () => void handleExportClassCsv() : undefined}
                  onExportCsvClassOverview={activeGroup && classOverview ? handleExportClassOverviewCsv : undefined}
                  onExportCsvGradeScale={handleExportGradeScaleCsv}
                  printLabel={printLabel}
                  printWithoutDetailsLabel={printWithoutDetailsLabel}
                  printGradeScaleLabel={printGradeScaleLabel}
                  classPrintLabel={classPrintLabel}
                  classOverviewPrintLabel={classOverviewPrintLabel}
                  exportCsvStudentLabel={exportCsvStudentLabel}
                  exportCsvClassLabel={exportCsvClassLabel}
                  exportCsvClassOverviewLabel={exportCsvClassOverviewLabel}
                  exportCsvGradeScaleLabel={exportCsvGradeScaleLabel}
                  printHint={printHint}
                />
              </div>
            )}
          </main>

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
        </div>
        <AppFooter />
      </div>

      <ConfirmDialog
        open={pendingImportPreview !== null}
        title="Import prüfen"
        description={
          pendingImportPreview?.warning
            ? `${pendingImportPreview.summary}\n\nWarnung: ${pendingImportPreview.warning}`
            : pendingImportPreview?.summary ?? ""
        }
        onCancel={() => setPendingImportPreview(null)}
        onConfirm={confirmImportPreview}
        confirmLabel="Import übernehmen"
      >
        <div className="dialog-preview rounded-2xl p-4">
          <p className="label">Datei</p>
          <p className="themed-strong text-sm font-medium">{pendingImportPreview?.sourceLabel}</p>
          {pendingImportPreview?.kind === "app-backup" ? (
            <p className="mt-3 text-sm" style={{ color: "var(--app-text)" }}>
              Der aktuelle Arbeitsstand wird vollständig ersetzt. Vor dem Übernehmen wird automatisch ein lokaler Rollback-Punkt erstellt.
            </p>
          ) : (
            <p className="mt-3 text-sm" style={{ color: "var(--app-text)" }}>
              Klassenarbeiten und Archiv bleiben erhalten. Die Schülerdatenbank wird ersetzt und ein lokaler Rollback-Punkt erstellt.
            </p>
          )}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingSecurityTokenCards.length > 0}
        title="Security-Token sichern"
        description="Das generierte Token wird nicht dauerhaft im Klartext gespeichert. Drucke oder kopiere es jetzt und bewahre es getrennt von Schülerlisten auf."
        onCancel={() => setPendingSecurityTokenCards([])}
        onConfirm={handlePrintSecurityTokens}
        confirmLabel="Druckkarte öffnen"
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
          setHeaderUnlockDialogOpen(false);
          setHeaderUnlockPasswordInput("");
          setHeaderUnlockError("");
        }}
        onConfirm={async () => {
          if (!activeGroup) return;
          const password = headerUnlockPasswordInput.trim();
          if (!password) {
            setHeaderUnlockError("Bitte gib das Klassenpasswort ein.");
            return;
          }

          const unlocked = await handleUnlockGroup(activeGroup.id, password, { silent: true });
          if (!unlocked) {
            setHeaderUnlockError("Das Klassenpasswort ist falsch.");
            return;
          }

          setHeaderUnlockDialogOpen(false);
          setHeaderUnlockPasswordInput("");
          setHeaderUnlockError("");
        }}
        confirmLabel="Lerngruppe entschlüsseln"
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
              onChange={(event) => {
                setHeaderUnlockPasswordInput(event.target.value);
                if (headerUnlockError) {
                  setHeaderUnlockError("");
                }
              }}
            />
          </Field>
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
          void saveDraft(draftBundle);
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
            removeWorkspace(workspaceToDelete.id);
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
              saveExpectationArchive(next);
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
    </div>
  );
}

export default App;
