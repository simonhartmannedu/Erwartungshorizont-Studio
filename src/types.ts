export type EvaluationMode = "direct" | "weighted";
export type GradeScaleMode = "percentage" | "points";
export type GradeScaleSource = "manual" | "notengenerator";
export type GradeAccumulationMode = "top" | "middle" | "bottom";
export type GradeScaleRecommendedStage = "sek1" | "sek2";
export type ThemeMode = "light" | "dark";
export type VisualTheme =
  | "earth-paper"
  | "waldmeister-schorle"
  | "blaubeer-pommesbude"
  | "flieder-feierabend"
  | "beamtensalon";

export interface ExamMeta {
  schoolYear: string;
  gradeLevel: string;
  course: string;
  teacher: string;
  examDate: string;
  title: string;
  unit: string;
  notes: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  maxPoints: number;
  achievedPoints: number;
  expectation: string;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  weight: number;
  linkedSectionId: string | null;
  maxPointsOverride: number | null;
  note: string;
  tasks: Task[];
}

export interface GradeBand {
  id: string;
  label: string;
  verbalLabel: string;
  lowerBound: number;
  color: string;
}

export interface GradeScaleGeneratorSettings {
  source: GradeScaleSource;
  thresholdPercent: number;
  accumulationMode: GradeAccumulationMode;
  useHalfPoints: boolean;
  showTendency: boolean;
  recommendedStage: GradeScaleRecommendedStage | null;
}

export interface GradeScale {
  id: string;
  title: string;
  mode: GradeScaleMode;
  schoolMode: "numeric" | "verbal" | "numericWithComment";
  bands: GradeBand[];
  commentTemplate: string;
  generator: GradeScaleGeneratorSettings;
}

export interface PrintSettings {
  showExpectations: boolean;
  showTeacherComment: boolean;
  compactRows: boolean;
  showWeightedOverview: boolean;
}

export interface EncryptedText {
  ciphertext: string;
  iv: string;
  salt: string;
}

export interface StudentRecord {
  id: string;
  alias: string;
  encryptedName: EncryptedText;
  isAbsent?: boolean;
  createdAt: string;
}

export interface StudentGroup {
  id: string;
  subject: string;
  className: string;
  passwordVerifier: EncryptedText | null;
  defaultSignatureDataUrl?: string | null;
  students: StudentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentAssessment {
  workspaceId: string | null;
  studentId: string;
  taskScores: Record<string, number>;
  teacherComment: string;
  signatureDataUrl?: string | null;
  updatedAt: string;
  printedAt: string | null;
}

export interface StudentDatabase {
  version: number;
  groups: StudentGroup[];
  assessments: Record<string, StudentAssessment>;
  updatedAt: string;
}

export interface Exam {
  id: string;
  meta: ExamMeta;
  evaluationMode: EvaluationMode;
  gradeScale: GradeScale;
  sections: Section[];
  printSettings: PrintSettings;
}

export interface DraftWorkspace {
  id: string;
  label: string;
  exam: Exam;
  activeArchiveEntryId: string | null;
  assignedGroupId: string | null;
  updatedAt: string;
  versions: DraftWorkspaceVersion[];
}

export interface DraftWorkspaceVersion {
  id: string;
  savedAt: string;
  exam: Exam;
}

export interface DraftBundle {
  activeWorkspaceId: string;
  workspaces: DraftWorkspace[];
}

export interface ExpectationArchiveEntry {
  id: string;
  examId: string;
  examTitle: string;
  schoolYear: string;
  gradeLevel: string;
  course: string;
  teacher: string;
  examDate: string;
  sectionCount: number;
  totalMaxPoints: number;
  expectationCount: number;
  summaryText: string;
  examSnapshot: Exam;
  createdAt: string;
}

export interface SectionResult {
  sectionId: string;
  maxPoints: number;
  achievedPoints: number;
  percentage: number;
  weightedPercentage: number;
}

export interface ValidationIssue {
  id: string;
  level: "warning" | "error";
  message: string;
}

export interface GradeResult {
  label: string;
  verbalLabel: string;
  lowerBound: number;
  schoolDisplay: string;
}

export interface ClassOverviewGradeDistributionItem {
  label: string;
  display: string;
  count: number;
  color: string;
}

export interface ClassOverviewSectionDistributionItem {
  sectionId: string;
  title: string;
  achievedPoints: number;
  maxPoints: number;
  percentage: number;
  color: string;
}

export interface ClassOverviewTaskDistributionItem {
  taskId: string;
  sectionId: string;
  sectionTitle: string;
  taskTitle: string;
  achievedPoints: number;
  maxPoints: number;
  percentage: number;
}

export interface ClassOverviewData {
  studentCount: number;
  averagePercentage: number;
  medianPercentage: number;
  bestPercentage: number;
  lowestPercentage: number;
  averageGrade: number;
  gradeDistribution: ClassOverviewGradeDistributionItem[];
  sectionDistribution: ClassOverviewSectionDistributionItem[];
  taskDistribution: ClassOverviewTaskDistributionItem[];
}

export interface NextGradeProgress {
  currentValue: number;
  nextValue: number | null;
  currentBandProgress: number;
  pointsNeeded: number;
  nextGradeLabel: string | null;
  nextGradeVerbalLabel: string | null;
}

export interface ExamSummary {
  totalMaxPoints: number;
  totalAchievedPoints: number;
  rawPercentage: number;
  weightedPercentage: number;
  finalPercentage: number;
  sectionResults: SectionResult[];
  grade: GradeResult;
  nextGradeProgress: NextGradeProgress;
  issues: ValidationIssue[];
}

export interface PointScalingPreview {
  originalTotal: number;
  targetTotal: number;
  factor: number;
}

export interface SelectedStudentContext {
  groupId: string;
  studentId: string;
}
