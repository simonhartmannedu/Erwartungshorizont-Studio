import { DraftBundle, Exam, ExpectationArchiveEntry, StudentDatabase, ThemeMode, VisualTheme } from "../types";
import { isArchiveEntry } from "./archive";
import { createEmptyExamMeta } from "./exam";
import { createGradeScaleGeneratorSettings } from "./gradeScaleGenerator";
import { createEmptyStudentDatabase, isStudentDatabase } from "./studentDatabase";
import { serializeStudentDatabaseForStorage } from "./students";

const DRAFT_KEY = "notenrechner-english-nrw-draft";
const ARCHIVE_KEY = "notenrechner-english-nrw-expectation-archive";
const STUDENT_DATABASE_KEY = "notenrechner-english-nrw-student-database";
const THEME_KEY = "notenrechner-english-nrw-theme";
const VISUAL_THEME_KEY = "notenrechner-english-nrw-visual-theme";

const SQLITE_DATABASE_NAME = "ewh-app-storage";
const SQLITE_DATABASE_VERSION = 1;
const SQLITE_OBJECT_STORE = "sqlite";
const SQLITE_BLOB_KEY = "app-storage";

type SqliteDatabase = import("sql.js").Database;

const normalizeExamDraft = (exam: Exam): Exam => ({
  ...exam,
  id: exam.id || crypto.randomUUID(),
  meta: {
    ...createEmptyExamMeta(),
    ...(exam.meta ?? {}),
  },
  gradeScale: {
    ...exam.gradeScale,
    id: exam.gradeScale.id || crypto.randomUUID(),
    mode: exam.gradeScale.mode === "points" ? "points" : "percentage",
    generator: {
      ...createGradeScaleGeneratorSettings(),
      ...exam.gradeScale.generator,
      // Accept older persisted values and normalize them into the current source enum.
      source:
        ((exam.gradeScale.generator as { source?: string } | undefined)?.source === "notengenerator" ||
          (exam.gradeScale.generator as { source?: string } | undefined)?.source === "rotering")
          ? "notengenerator"
          : "manual",
      accumulationMode:
        exam.gradeScale.generator?.accumulationMode === "top" ||
        exam.gradeScale.generator?.accumulationMode === "bottom"
          ? exam.gradeScale.generator.accumulationMode
          : "middle",
      recommendedStage:
        exam.gradeScale.generator?.recommendedStage === "sek1" ||
        exam.gradeScale.generator?.recommendedStage === "sek2"
          ? exam.gradeScale.generator.recommendedStage
          : null,
    },
    bands: exam.gradeScale.bands.map((band) => ({
      ...band,
      id: band.id || crypto.randomUUID(),
    })),
  },
  sections: exam.sections.map((section) => ({
    ...section,
    id: section.id || crypto.randomUUID(),
    tasks: section.tasks.map((task) => ({
      ...task,
      id: task.id || crypto.randomUUID(),
    })),
  })),
  printSettings: {
    showExpectations: exam.printSettings?.showExpectations ?? true,
    showTeacherComment: exam.printSettings?.showTeacherComment ?? true,
    compactRows: exam.printSettings?.compactRows ?? false,
    showWeightedOverview: exam.printSettings?.showWeightedOverview ?? false,
  },
});

const normalizeWorkspaceVersion = (version: { id?: string; savedAt?: string; exam: Exam }) => ({
  id: typeof version.id === "string" && version.id.trim().length > 0 ? version.id : crypto.randomUUID(),
  savedAt:
    typeof version.savedAt === "string" && version.savedAt.trim().length > 0
      ? version.savedAt
      : new Date().toISOString(),
  exam: normalizeExamDraft(version.exam),
});

const isDraftBundle = (value: unknown): value is DraftBundle => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DraftBundle>;
  return (
    typeof candidate.activeWorkspaceId === "string" &&
    Array.isArray(candidate.workspaces) &&
    candidate.workspaces.every(
      (workspace) =>
        workspace &&
        typeof workspace === "object" &&
        typeof workspace.id === "string" &&
        typeof workspace.label === "string" &&
        (typeof workspace.activeArchiveEntryId === "string" || workspace.activeArchiveEntryId === null) &&
        (typeof workspace.assignedGroupId === "string" ||
          workspace.assignedGroupId === null ||
          workspace.assignedGroupId === undefined) &&
        (typeof (workspace as { updatedAt?: unknown }).updatedAt === "string" ||
          (workspace as { updatedAt?: unknown }).updatedAt === undefined) &&
        (Array.isArray((workspace as { versions?: unknown[] }).versions) ||
          (workspace as { versions?: unknown[] }).versions === undefined) &&
        typeof workspace.exam === "object" &&
        workspace.exam !== null,
    )
  );
};

export const parseDraftBundle = (raw: string | null): DraftBundle | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isDraftBundle(parsed)) {
      const workspaces = parsed.workspaces.map((workspace) => ({
        ...workspace,
        exam: normalizeExamDraft(workspace.exam),
        assignedGroupId:
          typeof workspace.assignedGroupId === "string" || workspace.assignedGroupId === null
            ? workspace.assignedGroupId
            : null,
        updatedAt:
          typeof workspace.updatedAt === "string" && workspace.updatedAt.trim().length > 0
            ? workspace.updatedAt
            : new Date().toISOString(),
        versions: Array.isArray(workspace.versions)
          ? workspace.versions
              .filter(
                (version) =>
                  Boolean(version) &&
                  typeof version === "object" &&
                  "exam" in version &&
                  typeof version.exam === "object" &&
                  version.exam !== null,
              )
              .map((version) => normalizeWorkspaceVersion(version as { id?: string; savedAt?: string; exam: Exam }))
          : [],
      }));
      const activeWorkspaceId =
        workspaces.some((workspace) => workspace.id === parsed.activeWorkspaceId)
          ? parsed.activeWorkspaceId
          : workspaces[0]?.id ?? "";
      return workspaces.length > 0 ? { activeWorkspaceId, workspaces } : null;
    }

    return {
      activeWorkspaceId: "migrated-workspace",
      workspaces: [
        {
          id: "migrated-workspace",
          label: "Klassenarbeit 1",
          exam: normalizeExamDraft(parsed as Exam),
          activeArchiveEntryId: null,
          assignedGroupId: null,
          updatedAt: new Date().toISOString(),
          versions: [],
        },
      ],
    };
  } catch {
    return null;
  }
};

export const parseArchiveEntries = (raw: string | null): ExpectationArchiveEntry[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isArchiveEntry);
  } catch {
    return [];
  }
};

export const parseStudentDatabaseState = (raw: string | null): StudentDatabase => {
  if (!raw) return createEmptyStudentDatabase();
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isStudentDatabase(parsed) ? parsed : createEmptyStudentDatabase();
  } catch {
    return createEmptyStudentDatabase();
  }
};

const openIndexedDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(SQLITE_DATABASE_NAME, SQLITE_DATABASE_VERSION);

    request.onerror = () => reject(request.error ?? new Error("IndexedDB konnte nicht geöffnet werden."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SQLITE_OBJECT_STORE)) {
        database.createObjectStore(SQLITE_OBJECT_STORE);
      }
    };
  });

const runRequest = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("IndexedDB-Anfrage fehlgeschlagen."));
    request.onsuccess = () => resolve(request.result);
  });

const waitForTransaction = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB-Transaktion fehlgeschlagen."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB-Transaktion wurde abgebrochen."));
    transaction.oncomplete = () => resolve();
  });

const readPersistedDatabaseBlob = async () => {
  const database = await openIndexedDb();
  try {
    const transaction = database.transaction(SQLITE_OBJECT_STORE, "readonly");
    const store = transaction.objectStore(SQLITE_OBJECT_STORE);
    const blob = await runRequest(store.get(SQLITE_BLOB_KEY));
    await waitForTransaction(transaction);
    return blob instanceof Uint8Array ? blob : blob instanceof ArrayBuffer ? new Uint8Array(blob) : null;
  } finally {
    database.close();
  }
};

const writePersistedDatabaseBlob = async (bytes: Uint8Array) => {
  const database = await openIndexedDb();
  try {
    const transaction = database.transaction(SQLITE_OBJECT_STORE, "readwrite");
    transaction.objectStore(SQLITE_OBJECT_STORE).put(bytes, SQLITE_BLOB_KEY);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
};

const readStoredValue = (database: SqliteDatabase, key: string) => {
  const statement = database.prepare("SELECT value FROM app_state WHERE key = ?");
  try {
    statement.bind([key]);
    if (!statement.step()) return null;

    const row = statement.getAsObject() as { value?: unknown };
    return typeof row.value === "string" ? row.value : null;
  } finally {
    statement.free();
  }
};

const writeStoredValue = (database: SqliteDatabase, key: string, value: string) => {
  database.run(
    `INSERT INTO app_state (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, new Date().toISOString()],
  );
};

const clearLegacyDataKeys = () => {
  window.localStorage.removeItem(DRAFT_KEY);
  window.localStorage.removeItem(ARCHIVE_KEY);
  window.localStorage.removeItem(STUDENT_DATABASE_KEY);
};

const migrateLegacyLocalStorage = async (database: SqliteDatabase) => {
  const draft = parseDraftBundle(window.localStorage.getItem(DRAFT_KEY));
  const archiveEntries = parseArchiveEntries(window.localStorage.getItem(ARCHIVE_KEY));
  const studentDatabase = parseStudentDatabaseState(window.localStorage.getItem(STUDENT_DATABASE_KEY));

  if (draft) {
    writeStoredValue(database, DRAFT_KEY, JSON.stringify(draft));
  }
  if (archiveEntries.length > 0) {
    writeStoredValue(database, ARCHIVE_KEY, JSON.stringify(archiveEntries));
  }
  if (studentDatabase.groups.length > 0 || Object.keys(studentDatabase.assessments).length > 0) {
    writeStoredValue(database, STUDENT_DATABASE_KEY, JSON.stringify(studentDatabase));
  }

  await writePersistedDatabaseBlob(database.export());
  clearLegacyDataKeys();
};

let databasePromise: Promise<SqliteDatabase> | null = null;
let writeQueue = Promise.resolve();

const getDatabase = () => {
  if (!databasePromise) {
    databasePromise = (async () => {
      const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
        import("sql.js"),
        import("sql.js/dist/sql-wasm.wasm?url"),
      ]);
      const SQL = await initSqlJs({
        locateFile: () => wasmUrl,
      });

      const persistedBytes = await readPersistedDatabaseBlob();
      const database = persistedBytes ? new SQL.Database(persistedBytes) : new SQL.Database();

      database.run(
        `CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      );

      const hasPersistedDraft = readStoredValue(database, DRAFT_KEY) !== null;
      const hasPersistedArchive = readStoredValue(database, ARCHIVE_KEY) !== null;
      const hasPersistedStudentDatabase = readStoredValue(database, STUDENT_DATABASE_KEY) !== null;

      if (!hasPersistedDraft && !hasPersistedArchive && !hasPersistedStudentDatabase) {
        await migrateLegacyLocalStorage(database);
      }

      return database;
    })();
  }

  return databasePromise;
};

const enqueueWrite = (operation: (database: SqliteDatabase) => void | Promise<void>) => {
  const nextWrite = writeQueue.then(async () => {
    const database = await getDatabase();
    await operation(database);
    await writePersistedDatabaseBlob(database.export());
  });

  writeQueue = nextWrite.catch(() => undefined);
  return nextWrite;
};

export const loadDraft = async (): Promise<DraftBundle | null> => {
  const database = await getDatabase();
  return parseDraftBundle(readStoredValue(database, DRAFT_KEY));
};

export const saveDraft = (draftBundle: DraftBundle) =>
  enqueueWrite((database) => {
    writeStoredValue(database, DRAFT_KEY, JSON.stringify(draftBundle));
  });

export const loadExpectationArchive = async (): Promise<ExpectationArchiveEntry[]> => {
  const database = await getDatabase();
  return parseArchiveEntries(readStoredValue(database, ARCHIVE_KEY));
};

export const saveExpectationArchive = (entries: ExpectationArchiveEntry[]) =>
  enqueueWrite((database) => {
    writeStoredValue(database, ARCHIVE_KEY, JSON.stringify(entries));
  });

export const loadStudentDatabase = async (): Promise<StudentDatabase> => {
  const database = await getDatabase();
  return parseStudentDatabaseState(readStoredValue(database, STUDENT_DATABASE_KEY));
};

export const saveStudentDatabase = (
  databaseState: StudentDatabase,
  getUnlockedPassword?: (groupId: string) => string | null,
) =>
  enqueueWrite(async (database) => {
    const serializedState = getUnlockedPassword
      ? await serializeStudentDatabaseForStorage(databaseState, getUnlockedPassword)
      : databaseState;
    writeStoredValue(database, STUDENT_DATABASE_KEY, JSON.stringify(serializedState));
  });

export const loadTheme = (): ThemeMode => {
  const raw = window.localStorage.getItem(THEME_KEY);
  return raw === "dark" ? "dark" : "light";
};

export const saveTheme = (theme: ThemeMode) => {
  window.localStorage.setItem(THEME_KEY, theme);
};

export const loadVisualTheme = (): VisualTheme => {
  const raw = window.localStorage.getItem(VISUAL_THEME_KEY);
  switch (raw) {
    case "nrw-trikolore":
    case "waldmeister-schorle":
    case "blaubeer-pommesbude":
    case "flieder-feierabend":
    case "beamtensalon":
      return raw;
    default:
      return "earth-paper";
  }
};

export const saveVisualTheme = (theme: VisualTheme) => {
  window.localStorage.setItem(VISUAL_THEME_KEY, theme);
};
