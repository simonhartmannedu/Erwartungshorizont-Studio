# Entwicklung und Wartung

Diese Hinweise reichen für die alltägliche Pflege durch eine Person.

## Start und Prüfung

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

Vor einem Release führst du zusätzlich `npm run build:demo` aus; die Regressionstests sind bereits in `npm run check:release` enthalten. Dieser Befehl bündelt Lint, Typprüfung, Unit- und Regressionstests sowie Produktionsbuild und E2E-Tests gegen diese Build-Ausgabe. Für einen einzelnen Lauf nach einem vorhandenen Build verwendest du `npm run test:e2e:preview`. Der Release-Workflow prüft zusätzlich den Demo-Build, bevor er ein Tag-Artefakt erstellt.

Vor einem Pages-Deployment führt `npm run test:pages` den vollständigen Pages-Build mit Landingpage, produktiver App unter `/app/` und Demo unter `/demo/` aus. Anschließend prüfen Chromium und Firefox das tatsächliche Artefakt einschließlich relativer Ressourcen, SQLite-WASM, nachgeladenen Vorlagen, lokaler Speicherung und getrennter Demo-Daten. Der Pages-Workflow verwendet denselben Build und führt `npm run test:pages:artifact` vor dem Upload aus.

## Größere Updates abschließen

Bei jeder größeren, sichtbaren Änderung gehört die Releasepflege zum Abschluss:

1. Versionsnummer nach Semantic Versioning in `package.json` und `package-lock.json` erhöhen.
2. Den neuen Abschnitt in `CHANGELOG.md` mit Datum und den sichtbaren Änderungen ergänzen.
3. Die Release-Informationen im Terminal auf `landing/index.html` (Versionsnummer, ARIA-Label und Meldungen) auf dieselbe Version bringen.
4. `npm run check:release` und `npm run build:demo` ausführen. Wenn der vollständige Lauf lokal nicht praktikabel ist, mindestens die betroffenen E2E-Spezifikationen sowie Lint, Typprüfung, Unit-Tests und Build dokumentieren.

## Wo Änderungen hingehören

- Oberfläche und Abläufe: `src/components/`, `src/app/` und `src/features/`
- Fachlogik: `src/utils/` und `src/domain/`
- Persistente Datentypen: `src/types.ts`, `src/utils/storage.ts`, `src/infrastructure/`
- Export und Druck: `src/utils/export.ts`

`App.tsx` verbindet die Abläufe. Neue Fachlogik sollte nach Möglichkeit nicht dort, sondern in einer kleinen testbaren Funktion oder einem Controller landen.

## Änderungen mit Datenrisiko

Bei Storage, Migrationen, Backups, Wiederherstellung, Importen, Exporten oder Kryptografie:

1. Lies bestehende Datenformate weiter oder ergänze eine Migration.
2. Teste einen Erfolgspfad und mindestens einen Fehlerpfad.
3. Prüfe, ob Backup, Druck und Export das neue Feld bewusst behandeln.
4. Verwende nur fiktive Testdaten.

Die Daten liegen als sql.js-Datenbank in IndexedDB. Jede Speicherung prüft eine Revision, damit ein zweiter Tab keinen neueren Arbeitsstand überschreibt. Bei einem Konflikt muss die Seite neu geladen werden.

## Kleine Regeln, die viel Ärger sparen

- Committe keine echten Schülerdaten, Passwörter, Schlüssel oder Backups.
- Nimm keine neuen Abhängigkeiten ohne nachvollziehbaren Nutzen und Lizenzprüfung auf.
- Halte Änderungen klein und baue Datenwege nicht nebenbei um.
- Aktualisiere bei sichtbaren Änderungen die README, bei Datenschutzänderungen zusätzlich `docs/data-and-privacy.md`.
