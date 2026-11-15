import { beforeAll, describe, expect, it } from "vitest";
import { createPasswordVerifier, decryptText, encryptText, verifyPassword } from "./crypto";
import {
  getStudentParticipationStatus,
  hydrateSensitiveAssessmentsForGroup,
  renameStudentGroup,
  serializeStudentDatabaseForStorage,
  updateClassworkSignatures,
  updateStudentParticipationStatus,
  encryptAndScrubSensitiveAssessmentsForGroups,
  scrubSensitiveAssessmentsForGroups,
  addStudentGroup,
  copyStudentGroupForSubject,
  createStudentGroup,
  getStudentAssessment,
  getStudentGroupKey,
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

describe("Klassen für weitere Fächer", () => {
  it("unterscheidet gleiche Klassennamen nach Fach und ignoriert Großschreibung und äußere Leerzeichen", () => {
    expect(getStudentGroupKey(" Englisch ", "8A")).toBe(getStudentGroupKey("englisch", " 8a "));
    expect(getStudentGroupKey("Englisch", "8a")).not.toBe(getStudentGroupKey("Mathematik", "8a"));
  });

  const createSource = async () => {
    const group = createStudentGroup("Englisch", "8a");
    group.passwordVerifier = await createPasswordVerifier(group.id, "quelle-passwort");
    group.defaultSignatureDataUrl = "data:image/png;base64,quelle";
    group.students = [{
      id: "quelle-schueler",
      alias: "8A-01",
      encryptedName: await encryptText("Beispiel, Alex", "quelle-passwort"),
      isAbsent: true,
      createdAt: "2026-08-18T08:00:00.000Z",
    }];
    return group;
  };

  it("kopiert die Liste mit neuen IDs und eigenem Zugang ohne Bewertungen oder Abwesenheiten zu übernehmen", async () => {
    const source = await createSource();
    const before = JSON.stringify(source);
    const copy = await copyStudentGroupForSubject(source, "quelle-passwort", " Mathematik ", "ziel-passwort");
    expect(copy.id).not.toBe(source.id);
    expect(copy.subject).toBe("Mathematik");
    expect(copy.className).toBe(source.className);
    expect(copy.students.map((student) => student.alias)).toEqual(source.students.map((student) => student.alias));
    expect(copy.students[0].id).not.toBe(source.students[0].id);
    expect(copy.students[0].isAbsent).toBeUndefined();
    expect(copy.defaultSignatureDataUrl).toBeNull();
    await expect(decryptText(copy.students[0].encryptedName, "ziel-passwort")).resolves.toBe("Beispiel, Alex");
    await expect(decryptText(copy.students[0].encryptedName, "quelle-passwort")).rejects.toThrow();
    await expect(verifyPassword(copy.passwordVerifier, copy.id, "ziel-passwort")).resolves.toBe(true);
    const database: StudentDatabase = {
      version: 1, groups: [source], updatedAt: source.updatedAt,
      assessments: { "quelle-schueler": {
        workspaceId: null, studentId: "quelle-schueler", taskScores: { aufgabe: 4 },
        teacherComment: "Quellkommentar", updatedAt: source.updatedAt, printedAt: null,
      } },
    };
    const withCopy = addStudentGroup(database, copy);
    expect(withCopy.assessments).toBe(database.assessments);
    expect(getStudentAssessment(withCopy, copy.students[0].id).taskScores).toEqual({});
    expect(getStudentAssessment(withCopy, copy.students[0].id).teacherComment).toBe("");
    expect(JSON.stringify(source)).toBe(before);
  });

  it("weist falsche oder fehlende Passwörter und beschädigte Namen ohne Änderung der Quelle zurück", async () => {
    const source = await createSource();
    const before = JSON.stringify(source);
    for (const sourcePassword of ["", "falsches-passwort"]) {
      await expect(copyStudentGroupForSubject(source, sourcePassword, "Mathematik", "ziel-passwort")).rejects.toThrow("entsperre");
    }
    await expect(copyStudentGroupForSubject(source, "quelle-passwort", "Mathematik", "")).rejects.toThrow("Passwort");
    await expect(copyStudentGroupForSubject(source, "quelle-passwort", " ", "ziel-passwort")).rejects.toThrow("Fach");
    const damaged = { ...source, students: [{ ...source.students[0], encryptedName: { ciphertext: "AA==", iv: "AA==", salt: "AA==" } }] };
    await expect(copyStudentGroupForSubject(damaged, "quelle-passwort", "Mathematik", "ziel-passwort")).rejects.toThrow();
    expect(JSON.stringify(source)).toBe(before);
  });
});

describe("geschützte Abschlussprüfung", () => {
  const createDatabase = (): StudentDatabase => ({
    version: 1,
    groups: [{ id: "group", subject: "Deutsch", className: "T1", passwordVerifier: { ciphertext: "AA==", iv: "AA==", salt: "AA==" },
      students: [{ id: "student", alias: "T1-01", encryptedName: { ciphertext: "AA==", iv: "AA==", salt: "AA==" }, createdAt: "2026-11-07" }],
      createdAt: "2026-11-07", updatedAt: "2026-11-07" }],
    assessments: { "work::student": { workspaceId: "work", studentId: "student", taskScores: { task: 0 }, teacherComment: "Geprüfter Kommentar",
      correctionReview: { taskSignatures: { task: "vertrauliche Bewertungsgrundlage" }, confirmedAt: "2026-11-07", confirmedSignature: "vertraulicher Prüfstand" },
      updatedAt: "2026-11-07", printedAt: null } }, updatedAt: "2026-11-07",
  });

  it("verschlüsselt Prüfstände bei Speicherung und Sperren und stellt sie wieder her", async () => {
    const original = createDatabase();
    const stored = await serializeStudentDatabaseForStorage(original, () => "test-passwort");
    expect(stored.assessments["work::student"].correctionReview).toBeUndefined();
    expect(stored.assessments["work::student"].encryptedCorrectionReview).toBeTruthy();
    expect(JSON.stringify(stored)).not.toContain("vertraulich");
    const hydrated = await hydrateSensitiveAssessmentsForGroup(stored, "group", "test-passwort");
    expect(hydrated.assessments["work::student"].correctionReview).toEqual(original.assessments["work::student"].correctionReview);
    const scrubbed = scrubSensitiveAssessmentsForGroups(hydrated, ["group"]);
    expect(scrubbed.assessments["work::student"].correctionReview).toBeUndefined();
    const relocked = await encryptAndScrubSensitiveAssessmentsForGroups(hydrated, { group: "test-passwort" });
    expect(relocked.assessments["work::student"].correctionReview).toBeUndefined();
    const unlocked = await hydrateSensitiveAssessmentsForGroup(relocked, "group", "test-passwort");
    expect(unlocked.assessments["work::student"].correctionReview).toEqual(original.assessments["work::student"].correctionReview);
    expect(unlocked.assessments["work::student"].taskScores).toEqual({ task: 0 });
    await expect(hydrateSensitiveAssessmentsForGroup(stored, "group", "falsches-passwort")).rejects.toThrow();
  });

  it("weist einen entschlüsselbaren, aber beschädigten Prüfstand zurück", async () => {
    const stored = createDatabase();
    stored.assessments["work::student"].correctionReview = undefined;
    stored.assessments["work::student"].encryptedCorrectionReview = await encryptText('{"taskSignatures":42}', "test-passwort");
    await expect(hydrateSensitiveAssessmentsForGroup(stored, "group", "test-passwort")).rejects.toThrow("Ungültige Daten der Abschlussprüfung");
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

describe("Unterschriften", () => {
  it("speichert eine handschriftliche Signatur für alle Schüler*innen derselben Klassenarbeit", () => {
    const database: StudentDatabase = {
      version: 1,
      groups: [{
        id: "gruppe-1",
        subject: "Deutsch",
        className: "8a",
        passwordVerifier: null,
        students: [
          { id: "schueler-1", alias: "D8A-01", encryptedName: { ciphertext: "one", iv: "one", salt: "one" }, createdAt: "2026-08-18T08:00:00.000Z" },
          { id: "schueler-2", alias: "D8A-02", encryptedName: { ciphertext: "two", iv: "two", salt: "two" }, createdAt: "2026-08-18T08:00:00.000Z" },
        ],
        createdAt: "2026-08-18T08:00:00.000Z",
        updatedAt: "2026-08-18T08:00:00.000Z",
      }],
      assessments: {},
      updatedAt: "2026-08-18T08:00:00.000Z",
    };

    const updated = updateClassworkSignatures(
      database,
      "arbeit-1",
      database.groups[0]!.students.map((student) => student.id),
      "data:image/png;base64,signatur",
    );

    expect(updated.assessments["arbeit-1::schueler-1"]?.signatureDataUrl).toBe("data:image/png;base64,signatur");
    expect(updated.assessments["arbeit-1::schueler-2"]?.signatureDataUrl).toBe("data:image/png;base64,signatur");
    expect(updated.assessments["arbeit-2::schueler-1"]).toBeUndefined();
  });
});

describe("Klassen umbenennen", () => {
  it("behält die Gruppen-ID und damit Schüler- und Bewertungszuordnungen bei", () => {
    const database: StudentDatabase = {
      version: 1,
      groups: [{
        id: "gruppe-9a",
        subject: "Deutsch",
        className: "9a",
        passwordVerifier: null,
        students: [{
          id: "schueler-1",
          alias: "D9A-01",
          encryptedName: { ciphertext: "cipher", iv: "iv", salt: "salt" },
          createdAt: "2026-08-18T08:00:00.000Z",
        }],
        createdAt: "2026-08-18T08:00:00.000Z",
        updatedAt: "2026-08-18T08:00:00.000Z",
      }],
      assessments: {
        "arbeit-1::schueler-1": {
          workspaceId: "arbeit-1",
          studentId: "schueler-1",
          taskScores: { aufgabe: 4 },
          teacherComment: "",
          signatureDataUrl: null,
          updatedAt: "2026-08-18T08:00:00.000Z",
          printedAt: null,
        },
      },
      updatedAt: "2026-08-18T08:00:00.000Z",
    };

    const renamed = renameStudentGroup(database, "gruppe-9a", "10a");
    expect(renamed.groups[0]).toMatchObject({ id: "gruppe-9a", className: "10a" });
    expect(renamed.groups[0]?.students[0]?.id).toBe("schueler-1");
    expect(renamed.assessments["arbeit-1::schueler-1"]?.taskScores).toEqual({ aufgabe: 4 });
  });
});
