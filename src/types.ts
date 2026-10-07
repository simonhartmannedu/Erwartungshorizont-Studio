export type EvaluationMode = "direct" | "weighted";
export type GradeScaleMode = "percentage" | "points";
export type GradeScaleSource = "manual" | "notengenerator";
export type GradeAccumulationMode = "top" | "middle" | "bottom";
export type GradeScaleRecommendedStage = "sek1" | "sek2";
export type ThemeMode = "light" | "dark";
export type GroupAccessMode = "generated" | "manual";
export type VisualTheme =
  | "pdf-report"
  | "earth-paper"
  | "nrw-trikolore"
  | "waldmeister-schorle"
  | "blaubeer-pommesbude"
  | "flieder-feierabend"
  | "beamtensalon"
  | "barrierefrei"
  | "video-tutorial"
  | "kreidestaub-kaffein"
  | "overheadprojektor-3000"
  | "kopierer-0758";

export interface ExamMeta {
  schoolYear: string;
  subject: string;
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

/** A compact, machine-readable answer key. The question text stays on the actual exam paper. */
export interface MultipleChoiceAnswerBlock {
  id: string;
  type: "multipleChoice";
  title: string;
  taskId: string | null;
  /** When true, title and maximum points are maintained by this Bogencheck block. */
  managedTask?: boolean;
  optionLabels: string[];
  correctAnswers: string[];
  /** One editable point value per answer line. */
  answerPoints: number[];
  /** Legacy value, only used when reading older local drafts. */
  pointsPerAnswer?: number;
}

/** A matching task uses the same fixed answer grid: item number to selected letter. */
export interface MatchingAnswerBlock {
  id: string;
  type: "matching";
  title: string;
  taskId: string | null;
  /** When true, title and maximum points are maintained by this Bogencheck block. */
  managedTask?: boolean;
  optionLabels: string[];
  correctAnswers: string[];
  /** One editable point value per matching line. */
  answerPoints: number[];
  /** Legacy value, only used when reading older local drafts. */
  pointsPerAnswer?: number;
}

/** Binary statements are stored separately so they remain recognisable in the editor and on printouts. */
export interface TrueFalseAnswerBlock {
  id: string;
  type: "trueFalse";
  title: string;
  taskId: string | null;
  managedTask?: boolean;
  optionLabels: string[];
  correctAnswers: string[];
  answerPoints: number[];
  pointsPerAnswer?: number;
}

/** A row can contain several correct choices; it receives points only when the full set is selected. */
export interface MultipleResponseAnswerBlock {
  id: string;
  type: "multipleResponse";
  title: string;
  taskId: string | null;
  managedTask?: boolean;
  optionLabels: string[];
  correctAnswers: string[][];
  answerPoints: number[];
  pointsPerAnswer?: number;
}

/** Each row is assigned a position (normally 1, 2, 3, …) in a fixed answer grid. */
export interface OrderingAnswerBlock {
  id: string;
  type: "ordering";
  title: string;
  taskId: string | null;
  managedTask?: boolean;
  optionLabels: string[];
  correctAnswers: string[];
  answerPoints: number[];
  pointsPerAnswer?: number;
}

/** Kept only so existing local drafts can be opened; it is removed during normalization. */
export interface LegacyNumberedGapAnswerBlock {
  id: string;
  type: "numberedGaps";
  title: string;
  taskId: string | null;
  gapCount: number;
}

export type AnswerSheetBlock = MultipleChoiceAnswerBlock | MatchingAnswerBlock | TrueFalseAnswerBlock | MultipleResponseAnswerBlock | OrderingAnswerBlock | LegacyNumberedGapAnswerBlock;

export interface AnswerSheetSettings {
  blocks: AnswerSheetBlock[];
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

export type StudentParticipationStatus = "present" | "absent" | "excused" | "makeup";

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
  encryptedTaskScores?: EncryptedText | null;
  teacherComment: string;
  signatureDataUrl?: string | null;
  encryptedTeacherComment?: EncryptedText | null;
  encryptedSignatureDataUrl?: EncryptedText | null;
  /** Participation applies to this student in this particular classwork. */
  participationStatus?: StudentParticipationStatus;
  encryptedParticipationStatus?: EncryptedText | null;
  /** Opaque, random work code printed on a Bogencheck answer sheet. */
  answerSheetCode?: string;
  encryptedAnswerSheetCode?: EncryptedText | null;
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
  answerSheetSettings?: AnswerSheetSettings;
}

export interface DraftWorkspace {
  id: string;
  label: string;
  exam: Exam;
  activeArchiveEntryId: string | null;
  assignedGroupId: string | null;
  /** Set once an EWH has been deliberately created or edited, independent of its title. */
  setupCompletedAt?: string | null;
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
  subject: string;
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
