import { describe, expect, it } from "vitest";
import {
  CURRENT_STORED_APPLICATION_DATA_SCHEMA_VERSION,
  StoredApplicationDataMigrationError,
  createStoredApplicationData,
  migrateV1ToV2,
  parseStoredApplicationData,
} from "./storedApplicationData";

describe("versionierte gespeicherte Daten", () => {
  it("migriert einen v1-Rohwert deterministisch, ohne die Eingabe zu mutieren", () => {
    const legacy = { groups: [{ id: "gruppe-1", labels: ["A"] }] };
    const migrated = migrateV1ToV2(legacy);

    expect(migrated).toEqual({
      schemaVersion: CURRENT_STORED_APPLICATION_DATA_SCHEMA_VERSION,
      payload: legacy,
    });
    expect(migrated.payload).not.toBe(legacy);
    migrated.payload.groups[0].labels.push("B");
    expect(legacy.groups[0].labels).toEqual(["A"]);
    expect(migrateV1ToV2(legacy)).toEqual({
      schemaVersion: CURRENT_STORED_APPLICATION_DATA_SCHEMA_VERSION,
      payload: legacy,
    });
  });

  it("liest v1-Umschläge und erstellt beim neuen Speichern einen v2-Umschlag", () => {
    expect(parseStoredApplicationData<{ exam: string }>({ schemaVersion: 1, payload: { exam: "alt" } })).toEqual({
      schemaVersion: CURRENT_STORED_APPLICATION_DATA_SCHEMA_VERSION,
      payload: { exam: "alt" },
    });
    expect(createStoredApplicationData({ exam: "neu" }, "2026-08-06T12:00:00.000Z")).toEqual({
      schemaVersion: CURRENT_STORED_APPLICATION_DATA_SCHEMA_VERSION,
      updatedAt: "2026-08-06T12:00:00.000Z",
      payload: { exam: "neu" },
    });
  });

  it("bricht bei unbekannten zukünftigen Versionen ab", () => {
    expect(() => parseStoredApplicationData({ schemaVersion: 99, payload: {} })).toThrow(
      StoredApplicationDataMigrationError,
    );
    expect(() => parseStoredApplicationData({ schemaVersion: 99, payload: {} })).toThrow(
      "wird von dieser App-Version nicht unterstützt",
    );
  });

  it("verwechselt einen beschädigten Umschlag nicht mit einem Legacy-Rohwert", () => {
    expect(() => parseStoredApplicationData({ schemaVersion: 2 })).toThrow(
      "Datenumschlag ist unvollständig oder ungültig",
    );
  });
});
