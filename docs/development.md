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

Vor einem Release führst du zusätzlich `npm run test:regression`, `npm run test:e2e` und `npm run build:demo` aus. `npm run check:release` bündelt die wichtigsten nicht-browserbasierten Prüfungen.

## Wo Änderungen hingehören

- Oberfläche und Abläufe: `src/components/`, `src/app/` und `src/features/`
- Fachlogik: `src/utils/` und `src/domain/`
- Persistente Datentypen: `src/types.ts`, `src/utils/storage.ts`, `src/infrastructure/`
- PDF-Import: `src/components/PdfImportAssistant.tsx`, `src/pdf/`, `server/` und `vite.config.ts`
- Export und Druck: `src/utils/export.ts`

`App.tsx` verbindet die Abläufe. Neue Fachlogik sollte nach Möglichkeit nicht dort, sondern in einer kleinen testbaren Funktion oder einem Controller landen.

## Änderungen mit Datenrisiko

Bei Storage, Migrationen, Backups, Wiederherstellung, Importen, Exporten oder Kryptografie:

1. Lies bestehende Datenformate weiter oder ergänze eine Migration.
2. Teste einen Erfolgspfad und mindestens einen Fehlerpfad.
3. Prüfe, ob Backup, Druck und Export das neue Feld bewusst behandeln.
4. Verwende nur fiktive Testdaten.

Die Daten liegen als sql.js-Datenbank in IndexedDB. Jede Speicherung prüft eine Revision, damit ein zweiter Tab keinen neueren Arbeitsstand überschreibt. Bei einem Konflikt muss die Seite neu geladen werden.

## PDF-Import

PDFs dürfen erst nach Einwilligung verarbeitet werden. Browser und lokaler Dienst begrenzen Dateien auf 8 MB; der Dienst begrenzt auch parallele Aufträge und Laufzeiten. Die PDF-Verarbeitung läuft im lokalen Entwicklungsdienst. Wenn du anders bereitstellst, dokumentiere klar, wo PDFs verarbeitet werden und ob Daten das Gerät verlassen.

## Kleine Regeln, die viel Ärger sparen

- Committe keine echten Schülerdaten, Passwörter, Schlüssel oder Backups.
- Nimm keine neuen Abhängigkeiten ohne nachvollziehbaren Nutzen und Lizenzprüfung auf.
- Halte Änderungen klein und baue Datenwege nicht nebenbei um.
- Aktualisiere bei sichtbaren Änderungen die README, bei Datenschutzänderungen zusätzlich `docs/data-and-privacy.md`.
