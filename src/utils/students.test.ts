import { beforeAll, describe, expect, it } from "vitest";
import { createPasswordVerifier, encryptText } from "./crypto";
import {
  getStudentParticipationStatus,
  hydrateSensitiveAssessmentsForGroup,
  serializeStudentDatabaseForStorage,
  updateStudentParticipationStatus,
} from "./students";
import type { StudentDatabase } from "../types";

beforeAll(() => {
  Object.assign(globalThis, {
    window: {
      crypto: globalThis.crypto,
      btoa: (value: string) => Buffer.from(value, "binary").toString("base64"),
      atob: (value: string) => Buffer.from(value, "base64").toString("binary"),
    },
  });
});

describe("arbeitsbezogene Teilnahme", () => {
  it("gilt nur für die gewählte Arbeit und wird bei geschützten Klassen verschlüsselt gespeichert", async () => {
    const password = "test-passwort";
    const groupId = "gruppe-1";
    const studentId = "schueler-1";
    const database: StudentDatabase = {
      version: 1,
      groups: [{
        id: groupId,
        subject: "Deutsch",
        className: "8a",
        passwordVerifier: await createPasswordVerifier(groupId, password),
        students: [{
          id: studentId,
          alias: "D8A-01",
          encryptedName: await encryptText("Muster, Mina", password),
          createdAt: "2026-08-18T08:00:00.000Z",
        }],
        createdAt: "2026-08-18T08:00:00.000Z",
        updatedAt: "2026-08-18T08:00:00.000Z",
      }],
      assessments: {},
      updatedAt: "2026-08-18T08:00:00.000Z",
    };

    const updated = updateStudentParticipationStatus(database, "arbeit-1", studentId, "excused");
    expect(getStudentParticipationStatus(updated, studentId, "arbeit-1")).toBe("excused");
    expect(getStudentParticipationStatus(updated, studentId, "arbeit-2")).toBe("present");

    const stored = await serializeStudentDatabaseForStorage(updated, (id) => id === groupId ? password : null);
    const storedAssessment = stored.assessments["arbeit-1::schueler-1"];
    expect(storedAssessment.participationStatus).toBe("present");
    expect(storedAssessment.encryptedParticipationStatus).toBeTruthy();
    expect(JSON.stringify(stored)).not.toContain("excused");

    const hydrated = await hydrateSensitiveAssessmentsForGroup(stored, groupId, password);
    expect(getStudentParticipationStatus(hydrated, studentId, "arbeit-1")).toBe("excused");
  });
});
