import { applicationStorageScope } from "./storageScope";

type DirectoryPermissionMode = "read" | "readwrite";

type SelectedDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission: (options?: { mode?: DirectoryPermissionMode }) => Promise<PermissionState>;
  requestPermission: (options?: { mode?: DirectoryPermissionMode }) => Promise<PermissionState>;
  entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: DirectoryPermissionMode }) => Promise<SelectedDirectoryHandle>;
};

const DATABASE_NAME = `ewh-nextcloud-folder-${applicationStorageScope}`;
const DATABASE_VERSION = 1;
const OBJECT_STORE = "folder-handles";
const FOLDER_KEY = "nextcloud-backups";

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onerror = () => reject(request.error ?? new Error("NEXTCLOUD_FOLDER_STORAGE_UNAVAILABLE"));
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(OBJECT_STORE)) database.createObjectStore(OBJECT_STORE);
  };
  request.onsuccess = () => resolve(request.result);
});

const waitForTransaction = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.onerror = () => reject(transaction.error ?? new Error("NEXTCLOUD_FOLDER_STORAGE_UNAVAILABLE"));
  transaction.onabort = () => reject(transaction.error ?? new Error("NEXTCLOUD_FOLDER_STORAGE_UNAVAILABLE"));
  transaction.oncomplete = () => resolve();
});

const isDirectoryHandle = (value: unknown): value is SelectedDirectoryHandle =>
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
      request.onerror = () => reject(request.error ?? new Error("NEXTCLOUD_FOLDER_STORAGE_UNAVAILABLE"));
      request.onsuccess = () => resolve(request.result);
    });
    await waitForTransaction(transaction);
    return isDirectoryHandle(value) ? value : null;
  } finally {
    database.close();
  }
};

const storeHandle = async (handle: SelectedDirectoryHandle) => {
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

const ensurePermission = async (handle: SelectedDirectoryHandle, mode: DirectoryPermissionMode) => {
  const options = { mode };
  if (await handle.queryPermission(options) === "granted") return;
  if (await handle.requestPermission(options) !== "granted") throw new Error("NEXTCLOUD_FOLDER_PERMISSION_DENIED");
};

export const supportsNextcloudFolderConnection = () => typeof getPicker() === "function";

export const getConnectedNextcloudFolderName = async () => {
  if (!supportsNextcloudFolderConnection()) return null;
  const handle = await readStoredHandle();
  return handle?.name ?? null;
};

export const connectNextcloudFolder = async () => {
  const picker = getPicker();
  if (!picker) throw new Error("NEXTCLOUD_FOLDER_BROWSER_UNSUPPORTED");
  const handle = await picker({ id: "ewh-nextcloud-backups", mode: "readwrite" });
  await ensurePermission(handle, "readwrite");
  await storeHandle(handle);
  return handle.name;
};

const getWritableFolder = async () => {
  if (!supportsNextcloudFolderConnection()) throw new Error("NEXTCLOUD_FOLDER_BROWSER_UNSUPPORTED");
  const handle = await readStoredHandle();
  if (!handle) throw new Error("NEXTCLOUD_FOLDER_NOT_CONNECTED");
  await ensurePermission(handle, "readwrite");
  return handle;
};

export const saveEncryptedBackupToNextcloudFolder = async (filename: string, contents: string) => {
  const folder = await getWritableFolder();
  const file = await folder.getFileHandle(filename, { create: true });
  const writer = await file.createWritable();
  await writer.write(new Blob([contents], { type: "application/json" }));
  await writer.close();
};

export const getLatestNextcloudFolderBackup = async () => {
  const folder = await getWritableFolder();
  const files: File[] = [];
  for await (const [, entry] of folder.entries()) {
    if (entry.kind !== "file" || !entry.name.endsWith(".backup.json")) continue;
    files.push(await (entry as FileSystemFileHandle).getFile());
  }
  return files.sort((left, right) => right.lastModified - left.lastModified)[0] ?? null;
};
