import * as v from "valibot";

/** The current envelope version for persisted local values and encrypted payloads. */
export const CURRENT_STORED_APPLICATION_DATA_SCHEMA_VERSION = 2;

export interface StoredApplicationData<T> {
  schemaVersion: number;
  createdAt?: string;
  updatedAt?: string;
  payload: T;
}

export class StoredApplicationDataMigrationError extends Error {
  readonly code:
    | "STORAGE_JSON_INVALID"
    | "STORAGE_ENVELOPE_INVALID"
    | "STORAGE_PAYLOAD_INVALID"
    | "STORAGE_SCHEMA_UNSUPPORTED";

  constructor(
    code: StoredApplicationDataMigrationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "StoredApplicationDataMigrationError";
    this.code = code;
  }
}

const storedApplicationDataSchema = v.object({
  schemaVersion: v.number(),
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
  payload: v.unknown(),
});

const cloneJsonData = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Converts the historical unwrapped JSON value into the versioned envelope.
 * It is deterministic and never mutates the input value.
 */
export const migrateV1ToV2 = <T>(legacyPayload: T): StoredApplicationData<T> => ({
  schemaVersion: CURRENT_STORED_APPLICATION_DATA_SCHEMA_VERSION,
  payload: cloneJsonData(legacyPayload),
});

/** Creates a current envelope for a new write without changing its payload. */
export const createStoredApplicationData = <T>(
  payload: T,
  updatedAt = new Date().toISOString(),
): StoredApplicationData<T> => ({
  schemaVersion: CURRENT_STORED_APPLICATION_DATA_SCHEMA_VERSION,
  updatedAt,
  payload: cloneJsonData(payload),
});

/**
 * Reads either the legacy raw value (v1) or the explicit v2 envelope.
 * Callers validate the typed payload after this format-level boundary.
 */
export const parseStoredApplicationData = <T>(value: unknown): StoredApplicationData<T> => {
  const result = v.safeParse(storedApplicationDataSchema, value);

  if (!result.success) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "schemaVersion" in value
    ) {
      throw new StoredApplicationDataMigrationError(
        "STORAGE_ENVELOPE_INVALID",
        "Der gespeicherte Datenumschlag ist unvollständig oder ungültig.",
      );
    }
    return migrateV1ToV2(value as T);
  }

  const envelope = result.output;
  if (envelope.schemaVersion === CURRENT_STORED_APPLICATION_DATA_SCHEMA_VERSION) {
    return {
      schemaVersion: envelope.schemaVersion,
      ...(envelope.createdAt ? { createdAt: envelope.createdAt } : {}),
      ...(envelope.updatedAt ? { updatedAt: envelope.updatedAt } : {}),
      payload: cloneJsonData(envelope.payload as T),
    };
  }

  if (envelope.schemaVersion === 1) {
    return migrateV1ToV2(envelope.payload as T);
  }

  throw new StoredApplicationDataMigrationError(
    "STORAGE_SCHEMA_UNSUPPORTED",
    `Die Datenversion ${String(envelope.schemaVersion)} wird von dieser App-Version nicht unterstützt.`,
  );
};

export const parseStoredApplicationDataJson = <T>(raw: string): StoredApplicationData<T> => {
  try {
    return parseStoredApplicationData<T>(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof StoredApplicationDataMigrationError) throw error;
    throw new StoredApplicationDataMigrationError(
      "STORAGE_JSON_INVALID",
      "Die gespeicherten Daten sind kein gültiges JSON.",
    );
  }
};
