import { applicationStorageScope } from "./storageScope";
import type { PreparedFileSave } from "./export";

type DirectoryPermissionMode = "read" | "readwrite";

export type LocalBackupDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission: (options?: { mode?: DirectoryPermissionMode }) => Promise<PermissionState>;
  requestPermission: (options?: { mode?: DirectoryPermissionMode }) => Promise<PermissionState>;
  entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: DirectoryPermissionMode }) => Promise<LocalBackupDirectoryHandle>;
};

const DATABASE_NAME = `ewh-local-backup-folder-${applicationStorageScope}`;
const DATABASE_VERSION = 1;
const OBJECT_STORE = "folder-handles";
const FOLDER_KEY = "local-backup-overview";

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onerror = () => reject(request.error ?? new Error("LOCAL_BACKUP_FOLDER_STORAGE_UNAVAILABLE"));
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(OBJECT_STORE)) database.createObjectStore(OBJECT_STORE);
  };
  request.onsuccess = () => resolve(request.result);
});

const waitForTransaction = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.onerror = () => reject(transaction.error ?? new Error("LOCAL_BACKUP_FOLDER_STORAGE_UNAVAILABLE"));
  transaction.onabort = () => reject(transaction.error ?? new Error("LOCAL_BACKUP_FOLDER_STORAGE_UNAVAILABLE"));
  transaction.oncomplete = () => resolve();
});

const isDirectoryHandle = (value: unknown): value is LocalBackupDirectoryHandle =>
  Boolean(value)
  && typeof value === "object"
  && value !== null
  && "name" in value
  && "getFileHandle" in value
  && "queryPermission" in value;

const readStoredHandle = async () => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(OBJECT_STORE, "readonly");
    const request = transaction.objectStore(OBJECT_STORE).get(FOLDER_KEY);
    const value = await new Promise<unknown>((resolve, reject) => {
      request.onerror = () => reject(request.error ?? new Error("LOCAL_BACKUP_FOLDER_STORAGE_UNAVAILABLE"));
      request.onsuccess = () => resolve(request.result);
    });
    await waitForTransaction(transaction);
    return isDirectoryHandle(value) ? value : null;
  } finally {
    database.close();
  }
};

const storeHandle = async (handle: LocalBackupDirectoryHandle) => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(OBJECT_STORE, "readwrite");
    transaction.objectStore(OBJECT_STORE).put(handle, FOLDER_KEY);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
};

const getPicker = () => (window as DirectoryPickerWindow).showDirectoryPicker;

/** Directory selection is read-only. The persisted entry is only a browser file handle, never backup contents. */
export const supportsLocalBackupFolder = () => typeof getPicker() === "function";

export const selectLocalBackupFolder = async () => {
  const picker = getPicker();
  if (!picker) throw new Error("LOCAL_BACKUP_FOLDER_BROWSER_UNSUPPORTED");
  const handle = await picker({ id: "ewh-local-backup-overview", mode: "read" });
  if (await handle.requestPermission({ mode: "read" }) !== "granted") {
    throw new Error("LOCAL_BACKUP_FOLDER_PERMISSION_DENIED");
  }
  await storeHandle(handle);
  return handle.name;
};

export const getStoredLocalBackupFolder = async () => {
  if (!supportsLocalBackupFolder()) throw new Error("LOCAL_BACKUP_FOLDER_BROWSER_UNSUPPORTED");
  const handle = await readStoredHandle();
  if (!handle) throw new Error("LOCAL_BACKUP_FOLDER_NOT_SELECTED");
  if (await handle.queryPermission({ mode: "read" }) !== "granted") {
    throw new Error("LOCAL_BACKUP_FOLDER_PERMISSION_DENIED");
  }
  return handle;
};

/** Returns only the selected directory name. It does not request file access. */
export const getSelectedLocalBackupFolderName = async () => {
  if (!supportsLocalBackupFolder()) return null;
  return (await readStoredHandle())?.name ?? null;
};

/**
 * Requests write access only at the explicit save action. Listing stays read-only.
 * The file is created only when save() receives the fully generated encrypted backup.
 */
export const prepareLocalBackupFolderSave = async (filename: string): Promise<PreparedFileSave> => {
  if (!supportsLocalBackupFolder()) throw new Error("LOCAL_BACKUP_FOLDER_BROWSER_UNSUPPORTED");
  const folder = await readStoredHandle();
  if (!folder) throw new Error("LOCAL_BACKUP_FOLDER_NOT_SELECTED");
  if (await folder.queryPermission({ mode: "readwrite" }) !== "granted"
    && await folder.requestPermission({ mode: "readwrite" }) !== "granted") {
    throw new Error("LOCAL_BACKUP_FOLDER_WRITE_PERMISSION_DENIED");
  }

  return {
    save: async (blob) => {
      const file = await folder.getFileHandle(filename, { create: true });
      const writer = await file.createWritable();
      await writer.write(blob);
      await writer.close();
      return "saved";
    },
  };
};

export const listFilesInLocalBackupFolder = async () => {
  const folder = await getStoredLocalBackupFolder();
  const files: File[] = [];
  for await (const [, entry] of folder.entries()) {
    if (entry.kind !== "file") continue;
    try {
      files.push(await (entry as FileSystemFileHandle).getFile());
    } catch {
      // A single inaccessible file must not prevent the rest of the selected folder from being shown.
    }
  }
  return { folderName: folder.name, files };
};
