const assert = require("node:assert/strict");

const localStorageState = new Map();

global.window = {
  crypto: global.crypto,
  btoa: (value) => Buffer.from(value, "binary").toString("base64"),
  atob: (value) => Buffer.from(value, "base64").toString("binary"),
  localStorage: {
    getItem: (key) => localStorageState.get(key) ?? null,
    setItem: (key, value) => {
      localStorageState.set(key, String(value));
    },
    removeItem: (key) => {
      localStorageState.delete(key);
    },
  },
};

const { sampleExam } = require("../.regression-dist/src/data/sampleExam.js");
const { buildArchiveEntryFromExam, createEditableExamFromArchive } = require("../.regression-dist/src/utils/archive.js");
const { calculateExamSummary } = require("../.regression-dist/src/utils/calculations.js");
const { createPasswordVerifier, decryptText, encryptText, verifyPassword } = require(
  "../.regression-dist/src/utils/crypto.js",
);
const { cloneExam, withExamMeta } = require("../.regression-dist/src/utils/exam.js");
const { generateAutomatedExamFeedback } = require("../.regression-dist/src/utils/reportFeedback.js");
const {
  createEncryptedStudentDatabaseBackup,
  describeBackupStatus,
  parseStudentDatabaseBackup,
} = require("../.regression-dist/src/utils/backup.js");
const { renderPrintDocument } = require("../.regression-dist/src/utils/export.js");
const { parseDraftBundle, parseStudentDatabaseState } = require("../.regression-dist/src/utils/storage.js");
const {
  getEffectiveSignatureDataUrl,
  scaleTaskScoresForStudents,
  setStudentOrderInGroup,
} = require("../.regression-dist/src/utils/students.js");

const createStudentDatabase = async () => {
  const password = "Classroom-Secret-42";
  const groupId = "group-1";
  const studentId = "student-1";
  const encryptedName = await encryptText("Doe, Jane", password);

  return {
    password,
    database: {
      version: 1,
      groups: [
        {
          id: groupId,
          subject: "Englisch",
          className: "8b",
          passwordVerifier: await createPasswordVerifier(groupId, password),
          students: [
            {
              id: studentId,
              alias: "E8B-01",
              encryptedName,
              createdAt: "2026-03-01T08:00:00.000Z",
            },
          ],
          createdAt: "2026-03-01T08:00:00.000Z",
          updatedAt: "2026-03-02T09:00:00.000Z",
        },
      ],
      assessments: {
        [studentId]: {
          workspaceId: null,
          studentId,
          taskScores: {},
          teacherComment: "Strong effort <script>alert(1)</script>",
          signatureDataUrl: "data:image/png;base64,AA==",
          updatedAt: "2026-03-03T10:00:00.000Z",
          printedAt: null,
        },
      },
      updatedAt: "2026-03-03T10:00:00.000Z",
    },
  };
};

const testStorageMigration = () => {
  const legacyExam = {
    ...sampleExam,
    id: "",
    meta: {
      ...sampleExam.meta,
      title: "Legacy Import",
    },
  };

  const bundle = parseDraftBundle(JSON.stringify(legacyExam));
  assert.ok(bundle, "legacy draft should migrate into a draft bundle");
  assert.equal(bundle.activeWorkspaceId, "migrated-workspace");
  assert.equal(bundle.workspaces[0]?.exam.meta.title, "Legacy Import");
  assert.ok(bundle.workspaces[0]?.exam.id, "migrated exam should have an id");
  assert.equal(Array.isArray(bundle.workspaces[0]?.versions), true, "migrated draft should initialize versions");
  assert.equal(typeof bundle.workspaces[0]?.updatedAt, "string", "migrated draft should initialize updatedAt");

  const bundleWithMissingVersionFields = parseDraftBundle(
    JSON.stringify({
      activeWorkspaceId: "workspace-1",
      workspaces: [
        {
          id: "workspace-1",
          label: "Klassenarbeit 1",
          exam: legacyExam,
          activeArchiveEntryId: null,
          assignedGroupId: null,
        },
      ],
    }),
  );
  assert.ok(bundleWithMissingVersionFields, "draft bundle without version fields should still parse");
  assert.equal(bundleWithMissingVersionFields.workspaces[0].versions.length, 0);
  assert.equal(typeof bundleWithMissingVersionFields.workspaces[0].updatedAt, "string");

  const invalidDatabase = parseStudentDatabaseState(
    JSON.stringify({
      version: 1,
      groups: [{ id: "x" }],
      assessments: {},
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
  );
  assert.equal(invalidDatabase.groups.length, 0, "invalid student database should reset to an empty state");
};

const testGroupUnlockAndDecrypt = async () => {
  const { password, database } = await createStudentDatabase();
  const group = database.groups[0];
  const student = group.students[0];

  assert.equal(await verifyPassword(group.passwordVerifier, group.id, password), true);
  assert.equal(await verifyPassword(group.passwordVerifier, group.id, "wrong-pass"), false);
  assert.equal(await decryptText(student.encryptedName, password), "Doe, Jane");
};

const testEncryptedBackupRoundTrip = async () => {
  const { database } = await createStudentDatabase();
  const backup = await createEncryptedStudentDatabaseBackup(database, "Backup-Secret-99");
  const restored = await parseStudentDatabaseBackup(backup, "Backup-Secret-99");

  assert.deepEqual(restored, database, "encrypted backup should round-trip the full database");

  const status = describeBackupStatus(database, backup.exportedAt);
  assert.equal(status.tone, "success");
};

const testPrintEscaping = async () => {
  const { database } = await createStudentDatabase();
  const summary = calculateExamSummary(sampleExam);
  const reports = [
    {
      exam: {
        ...sampleExam,
        meta: {
          ...sampleExam.meta,
          title: 'Exam <img src=x onerror="alert(1)">',
        },
        sections: sampleExam.sections.map((section, index) =>
          index === 0
            ? {
                ...section,
                title: "Section <script>alert(1)</script>",
                tasks: section.tasks.map((task, taskIndex) =>
                  taskIndex === 0
                    ? {
                        ...task,
                        title: 'Task "A"',
                        description: "<b>unsafe</b>",
                      }
                    : task,
                ),
              }
            : section,
        ),
      },
      summary,
      identity: {
        alias: "E8B-01",
        fullName: "Jane <Doe>",
        subject: "Englisch",
        className: "8b",
        teacherComment: database.assessments["student-1"].teacherComment,
        signatureDataUrl: "javascript:alert(1)",
      },
    },
    {
      exam: sampleExam,
      summary,
      identity: {
        alias: "E8B-02",
        fullName: "John Roe",
        subject: "Englisch",
        className: "8b",
        teacherComment: "Second student",
        signatureDataUrl: "data:image/png;base64,AA==",
      },
    },
  ];

  const html = renderPrintDocument(reports);
  assert.match(html, /Exam &lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /Jane &lt;Doe&gt;/);
  assert.match(html, /Strong effort &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /javascript:alert\(1\)/);
  assert.match(html, /data:image\/png;base64,AA==/);
  assert.match(html, /Notenbereiche/);
};

const testClassDefaultSignatureFallback = async () => {
  const { database } = await createStudentDatabase();
  const group = {
    ...database.groups[0],
    defaultSignatureDataUrl: "/signature.svg",
  };
  const assessment = {
    ...database.assessments["student-1"],
    signatureDataUrl: null,
  };
  const summary = calculateExamSummary(sampleExam);
  const effectiveSignature = getEffectiveSignatureDataUrl(group, assessment);

  assert.equal(effectiveSignature, "/signature.svg");

  const html = renderPrintDocument([
    {
      exam: sampleExam,
      summary,
      identity: {
        alias: "E8B-01",
        fullName: "Jane Doe",
        subject: group.subject,
        className: group.className,
        teacherComment: assessment.teacherComment,
        signatureDataUrl: effectiveSignature,
      },
    },
  ]);

  assert.match(html, /src="\/signature\.svg"/);
};

const testTaskScoreScaling = async () => {
  const { database } = await createStudentDatabase();
  const studentId = "student-1";
  const scaled = scaleTaskScoresForStudents(
    {
      ...database,
      assessments: {
        [studentId]: {
          ...database.assessments[studentId],
          taskScores: {
            taskA: 8,
          },
        },
      },
    },
    [studentId],
    null,
    "taskA",
    10,
    12,
  );

  assert.equal(scaled.assessments[studentId].taskScores.taskA, 9.5);
};

const testStudentReorderingKeepsAssessments = async () => {
  const { database } = await createStudentDatabase();
  const group = database.groups[0];
  const secondStudentId = "student-2";
  const reordered = setStudentOrderInGroup(
    {
      ...database,
      groups: [
        {
          ...group,
          students: [
            ...group.students,
            {
              id: secondStudentId,
              alias: "E8B-02",
              encryptedName: group.students[0].encryptedName,
              createdAt: "2026-03-01T08:05:00.000Z",
            },
          ],
        },
      ],
      assessments: {
        ...database.assessments,
        [secondStudentId]: {
          workspaceId: null,
          studentId: secondStudentId,
          taskScores: { taskA: 4 },
          teacherComment: "",
          signatureDataUrl: null,
          updatedAt: "2026-03-03T11:00:00.000Z",
          printedAt: null,
        },
      },
    },
    group.id,
    [secondStudentId, group.students[0].id],
  );

  assert.deepEqual(
    reordered.groups[0].students.map((student) => student.id),
    [secondStudentId, group.students[0].id],
    "student order should follow the requested id order",
  );
  assert.equal(
    reordered.assessments[group.students[0].id].studentId,
    group.students[0].id,
    "existing assessments should still be keyed by student id after reordering",
  );
  assert.equal(
    reordered.assessments[secondStudentId].taskScores.taskA,
    4,
    "assessment data for reordered students should remain unchanged",
  );
};

const testDuplicatedArchiveExamGetsFreshIds = () => {
  const archiveEntry = buildArchiveEntryFromExam(sampleExam);
  const duplicate = createEditableExamFromArchive(archiveEntry, { duplicate: true });

  assert.notEqual(
    duplicate.id,
    archiveEntry.examId,
    "duplicated archive exams should receive a fresh exam id",
  );
  assert.match(
    duplicate.meta.title,
    /Kopie$/,
    "duplicated archive exams should be clearly marked as copies",
  );
};

const testExamMetadataIsScopedPerClone = () => {
  const original = cloneExam(sampleExam);
  const duplicate = withExamMeta(sampleExam, {
    ...sampleExam.meta,
    title: "Neue Klassenarbeit",
  });

  duplicate.meta.title = "Geaenderte Kopie";

  assert.equal(
    original.meta.title,
    sampleExam.meta.title,
    "changing cloned exam metadata must not mutate the original exam",
  );
  assert.equal(
    sampleExam.meta.title,
    "Englisch-Klassenarbeit Unit 4",
    "source exam metadata should stay attached to its own exam instance",
  );
};

const testAutomatedFeedbackIncludesStrengthAndNextStep = () => {
  const feedback = generateAutomatedExamFeedback({
    exam: sampleExam,
    summary: calculateExamSummary(sampleExam),
    style: "balanced",
  });

  assert.match(feedback, /Besonders gelungen|Besonders positiv|Am stärksten/);
  assert.match(feedback, /Achte bei der nächsten Arbeit besonders auf|Nächster Schritt:|gezielt übst/);
};

Promise.all([
  Promise.resolve().then(testStorageMigration),
  testGroupUnlockAndDecrypt(),
  testEncryptedBackupRoundTrip(),
  testPrintEscaping(),
  testClassDefaultSignatureFallback(),
  testTaskScoreScaling(),
  testStudentReorderingKeepsAssessments(),
  Promise.resolve().then(testDuplicatedArchiveExamGetsFreshIds),
  Promise.resolve().then(testExamMetadataIsScopedPerClone),
  Promise.resolve().then(testAutomatedFeedbackIncludesStrengthAndNextStep),
])
  .then(() => {
    console.log("Regression checks passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
