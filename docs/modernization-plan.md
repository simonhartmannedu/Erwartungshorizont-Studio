# Modernisierungsplan

Stand: 6. August 2026. Dieses Dokument beschreibt die schrittweise Modernisierung ohne Änderung bestehender Datenformate in Phase 0 und 1.

## Aktueller Architekturüberblick

Erwartungshorizont-Studio ist eine lokale React-18/Vite-SPA. `src/App.tsx` (5.141 Zeilen) ist die zentrale Orchestrierung: es hält persistenten Anwendungszustand, Session- und UI-Zustand und verbindet ihn mit den Panels in `src/components/`. Fachlogik liegt überwiegend in `src/utils/`, zentrale Typen in `src/types.ts`.

| Bereich | Ist-Zustand |
| --- | --- |
| UI | React-Komponenten, Tailwind; `App.tsx` rendert tab-basierte Navigation und Dialoge. |
| Persistenz | `sql.js`-Datenbank als einzelner Blob in IndexedDB; `app_state` speichert JSON unter drei Schlüsseln. Neue Schreibvorgänge verwenden seit Phase 2 einen versionierten v2-Umschlag. |
| Legacy-Persistenz | Einmalige Übernahme der bisherigen `localStorage`-Schlüssel, danach Löschung der Legacy-Schlüssel. |
| Fachobjekte | `DraftBundle`/Workspaces, Archiv-Einträge, `StudentDatabase` mit Gruppen und Bewertungen. |
| Backups | Verschlüsselte JSON-Umschläge, jeweils Formatversion `1`; Vollbackup, Schülerdatenbank und Schuljahresarchiv. |
| Schutz | AES-256-GCM, Schlüssel aus PBKDF2-SHA-256 mit 250.000 Iterationen, zufälligem 16-Byte-Salt und 12-Byte-IV. |
| Externe Verarbeitung | PDF-Import verwendet lokale Vite-Middleware und optionale Poppler-/Tesseract-Programme. |
| Tests und CI | Bestehender Node-basierter Regressionslauf; Pages-Workflow baute bislang ohne Lint- oder Unit-Test-Gates. |
| Lizenz | Community-Kern unter AGPL-3.0-only; lokale Kernfunktionen bleiben ohne Cloud oder Konto nutzbar. |

### Verantwortlichkeiten von `App.tsx`

- Initialisierung, Laden/Speichern und Fehleranzeige der drei Persistenzbereiche.
- Navigation, Onboarding, Theme, Vollbild, Auswahl von Workspace/Lerngruppe/Schüler und Modal-Zustände.
- Entsperr-Sitzungen, Inaktivitäts-Timeout, Hydrieren und Bereinigen geschützter Schülerdaten.
- Workspace- und EWH-Editor-Commands einschließlich Versionen, Abschnittsänderungen und Skalierungen.
- Lerngruppen-, Schüler-, Archiv-, Schuljahresarchiv- und Backup-Workflows.
- CSV/XLSX/ODS/DOCX/PDF-/Druck- und Import-Workflows.
- Abgeleitete Ansichten für Bewertung, Klassenübersicht, Sicherungsstatus und Schuljahrfilter.

## Technische Risiken

1. **Datenverlust bei Persistenzänderungen:** Der SQLite-Blob enthält mehrere JSON-Dokumente ohne gemeinsame Anwendungsschema-Version. Die Legacy-Übernahme löscht Quellschlüssel nach dem Schreiben; sie benötigt vor jeder Änderung Rückwärtskompatibilität und Ausfalltests.
2. **Unklare Migrationsgrenzen:** `parseDraftBundle` normalisiert historische Formen implizit, die Studentendaten nutzen unabhängig `version: 1`, Backups weitere `version: 1`. Eine Änderung kann leicht nur einen Pfad aktualisieren.
3. **Großer Orchestrator:** `App.tsx` vereint weit über 50 Commands und viele Zustände. Große Refactorings können Persistenzreihenfolgen, Entsperren oder Wiederherstellung unbemerkt verändern.
4. **Restore-Risiko:** Vollbackup-Import überschreibt In-Memory-Zustand nach Vorschau. Ein Wiederherstellungs-Checkpoint existiert, aber ein expliziter persistierter Vorab-Backup-Schritt und formatierte Fehlercodes fehlen.
5. **Validierungsgrenzen:** Die vorhandenen Type Guards sind handgeschrieben und normalisieren teils fehlende Daten. Ungültige lokale Daten können dabei auf leere Daten zurückfallen; der Nutzer erhält nicht immer eine exportierbare Diagnose.
6. **Kryptografische Betriebsgrenzen:** Browserdaten liegen während einer entsperrten Sitzung im JavaScript-Speicher. Sie lassen sich nicht praktisch vollständig und beweisbar überschreiben. Passwort, Klartextschlüssel und entschlüsselte Werte dürfen nicht in neue Stores, Logs oder Telemetrie gelangen.
7. **PDF-Import:** Bei nichtstatischem Betrieb kann Dokumenttext die Browsergrenze über die lokale Middleware verlassen. Deployment, Logs und Tool-Aufrufpfade müssen pro Installation geprüft werden.
8. **Tooling-/Lieferkettenrisiko:** Es gab keine reguläre Lint-/Unit-Test-Suite vor Deployment. `xlsx`, `docx` und `sql.js` sind gewichtige Abhängigkeiten; Optimierung erst nach Messung. Der Produktions-Audit vom 6. August 2026 meldet für `xlsx@0.18.5` zwei High-Severity-Advisories (Prototype Pollution, GHSA-4r6h-8v6p-xvw6, und ReDoS, GHSA-5pgg-2g8v-p4x9); laut npm ist kein automatischer Fix verfügbar. Importdateien bleiben deshalb eine besonders kritische Grenze und ein Bibliothekswechsel braucht einen eigenen Kompatibilitäts-PR.
9. **Lizenz- und Drittmaterialrisiko:** Der Community-Kern ist auf AGPL-3.0-only umgestellt. Die Rechtekette für historische Beiträge, Fonts, Assets und Abhängigkeiten muss bei jeder Veröffentlichung weiterhin geprüft werden; deren eigene Lizenzen bleiben maßgeblich.

## Zielstruktur und Architekturprinzipien

Die Struktur wird nur entlang nachweislicher fachlicher Grenzen eingeführt:

```text
src/
  app/                 # App-Shell, Navigation, Router, globale Fehlergrenze
  features/            # UI-Controller pro Workflow
    workspaces/ rubrics/ grading/ students/ archive/ backups/
    imports/ exports/ onboarding/ settings/
  domain/              # reine Fachmodelle, Berechnungen und Commands
    exams/ rubrics/ grading/ students/ archives/ backups/
  infrastructure/      # IndexedDB/sql.js, Crypto, Format-Adapter, Migrationen
    storage/ crypto/ imports/ exports/ migrations/
  shared/              # wiederverwendbare Komponenten, Hooks, Utils und Typen
```

Der offene Kern wird in dieser Einzel-Repository-Struktur als `src/domain`, `src/infrastructure` und die nötigen `src/shared`-Teile abgegrenzt. Spätere optionale Erweiterungen liegen außerhalb des Kernimports, zum Beispiel unter `src/integrations/` oder `src/enterprise-stubs/`. Domain-Code erhält keine Lizenzprüfungen, keine Datenlimits und keine Abhängigkeit von proprietärem Code.

Zielzustand von `app/App.tsx`: globale Initialisierung, Zusammenführung der Controller, App-Shell/Hauptansicht und globale Error Boundaries. Navigation und Layout werden zuerst extrahiert, danach reine Präsentation, Modals, Berechnungen und Import/Export-Helfer. Erst anschließend folgen Backup, Archiv, Lerngruppen, Bewertung, Workspaces, Demo und Onboarding.

State wird fachlich getrennt: persistenter Domain-State, Session-State (Auswahl/Entsperren), UI-State (Dialoge/Filter) und abgeleiteter State. Controller bieten Commands wie `workspace.archive(id)` oder `grading.updateScore(...)`; abgeleitete Werte werden nicht redundant gespeichert. Vor einer Store-Bibliothek werden `useReducer`, Controller-Hooks und eng begrenzter Context bewertet.

## Arbeitspakete und Abhängigkeiten

| Phase | Paket | Voraussetzung | Ergebnis |
| --- | --- | --- | --- |
| 0 | Analyse und Entscheidungsdokumente | – | Risiken, Grenzen und Dateninventar dokumentiert. |
| 1 | Qualitätsfundament | Phase 0 | ESLint, Typecheck, Vitest, erste Tests und CI-Gates. |
| 2 | Datenvertrag und Migrationen | 1 | Expliziter `StoredApplicationData`-Umschlag, einzelne pure Migrationen und Runtime-Validierung. |
| 3 | Sichere Fehler- und Backupgrenzen | 2 | Fehlercodes, Restore-Bestätigung, Vorab-Sicherung, globaler Backup-Status. |
| 4 | Risikoarme UI-Extraktion | 1, 2 | `app/`-Shell/Navigation und reine Feature-Komponenten ohne Verhaltensänderung. |
| 5 | Fachcontroller | 3, 4 | Backups, Archiv, Lerngruppen, Bewertung und Workspaces separat testbar. |
| 6 | UX, Sicherheit und Accessibility | 3, 5 | Sperren, Onboarding, Einfachmodus, a11y-Checks und Diagnoseexport. |
| 7 | PWA und Performance | 2, 6 | Messwerte, kontrollierter Service Worker, Update-Hinweis und Offline-Tests. |
| 8 | Release-/Community-Reife | 1–7 | SemVer, stabile Datenformate, E2E, Dependabot/optional CodeQL und Releaseprozess. |

## Datenmigrationsstrategie

1. Vor jeder Schreibmigration bestehende Daten lesen, validieren und unverändert klonen.
2. Einen expliziten äußeren Umschlag einführen: `schemaVersion`, optionale Zeitstempel und `payload`; bestehende Schlüssel bleiben zunächst lesbar.
3. Jede Migration als benannte, reine Funktion (`migrateV1ToV2` usw.) mit Eingabe-/Ausgabevertrag, Tests, Fehlercode und Dokumentation implementieren.
4. Keine all-in-one-Migration und keine Mutation der Eingabe. Unbekannte zukünftige Versionen werden abgelehnt, nie stillschweigend zurückgestuft.
5. Vor irreversibler Wiederherstellung ausdrückliche Bestätigung und, soweit Speicher verfügbar ist, lokale verschlüsselte Vorab-Sicherung anbieten.
6. Alte Backups und Legacy-`localStorage` bleiben durch Kompatibilitätstests lesbar. Testdaten verwenden ausschließlich fiktive Namen/Aliase.

Für die Formatgrenze wird seit Phase 2 **Valibot** verwendet: Die kleine, tree-shakebare Bibliothek validiert den versionierten Umschlag vor jeder lokalen oder entschlüsselten Übernahme. Die bestehenden strukturellen Domain-Guards validieren anschließend Workspaces, Archive und Schülerdaten. Detailliertere Feldschemas werden schrittweise pro Domain eingeführt, nicht als ungetestete Komplettumstellung.

## Teststrategie

- **Unit:** Punkte, Noten, Rundung, Grenzwerte, Normalisierung, Migrationen, Backup-/Import-Validierung, Archivlogik und Korrekturstände.
- **Integration:** Lerngruppe anlegen, EWH erstellen, zuweisen, bewerten, kommentieren, archivieren/wiederherstellen sowie Backup erzeugen/wiederherstellen.
- **E2E (Playwright, spätere Phase):** Demo, Gruppenanlage/-import, Bewertung mehrerer Schüler, Reload-Persistenz, Backup/Restore, falsches Passwort, beschädigtes/älteres Backup und Berichtsexport.
- **Sicherheits- und Accessibility-Checks:** negative Import-/Restorefälle, keine echten personenbezogenen Daten, später axe-Checks sowie Tastatur- und Dialogtests.
- **CI:** `npm ci`, Lint, Typecheck, Unit-Tests und Build sind vor Deployment verpflichtend; stabile E2E folgen nach dem Fundament.

## Sicherheits- und Open-Core-Abgrenzung

Der dauerhaft freie lokale Kern umfasst Lerngruppen, EWH, Korrektur, Bewertungen/Kommentare, Archive, Exporte, verschlüsselte lokale Backups, Migrationen, Offline-Nutzung, Accessibility-Basis, Kernimporte/-templates und die Datenformatdokumentation. Nicht im Kern liegen mögliche gehostete Synchronisation, Schuladministration, SSO, Cloud-Backups, zentraler Rollout, Mandantenfähigkeit, SLA oder Premium-Support.

Keine externe Telemetrie, Analytics oder externe Fehlerdienste werden standardmäßig eingeführt. Ein späterer Diagnoseexport ist lokal und nur nach sichtbarer Einwilligung möglich; er enthält keine Schüler-, Bewertungs-, Kommentar-, Passwort- oder Schlüsselwerte.

Die Anwendung unterstützt eine datensparsame, lokale Verarbeitung. Die datenschutzrechtliche Bewertung hängt vom konkreten schulischen Einsatz ab.

## Definition of Done je Phase

Jede Phase ist erst fertig, wenn Typecheck, Lint, relevante Unit-/Integrationstests und Build erfolgreich sind; kritische E2E-Flows nicht beschädigt sind, soweit vorhanden; vorhandene Daten kompatibel gelesen oder migriert werden; Dokumentation aktualisiert ist; keine unnötige Abhängigkeit, keine echten Schülerdaten und keine Verschlechterung von Accessibility, Offline-Nutzung oder Backup/Restore eingeführt wurden. Sicherheits- und Datenphasen benötigen zusätzlich negative Tests und eine dokumentierte Review der betroffenen Grenzen. Eine Phase mit Datenformatänderung benötigt ein getestetes Upgrade aus jeder unterstützten Vorgängerversion.

## Phase-1-Status

Phase 1 ergänzt Lint, Typecheck, Vitest, erste reine Unit-Tests, CI-Gates, Changelog, Projekt-/Mitwirkungsdokumentation. Sie verändert weder das Datenformat noch die Verschlüsselungslogik noch die Struktur von `App.tsx`.

## Phase 2, Arbeitspaket 2.1: Versionierte Speicher- und Backup-Umschläge

**Problem und Risiko:** Lokale JSON-Werte und verschlüsselte Backup-Payloads waren versionslos. Beschädigte oder zukünftige Daten konnten bislang in einen leeren Anwendungszustand fallen und dadurch beim anschließenden automatischen Speichern überschrieben werden.

**Betroffene Dateien:** `src/infrastructure/migrations/storedApplicationData.ts`, `src/utils/storage.ts`, `src/utils/backup.ts` sowie die zugehörigen Unit- und Regressionstests.

**Änderung:** Neue lokale Werte verwenden `{ schemaVersion: 2, updatedAt, payload }`; neue verschlüsselte Backups haben weiterhin nur nicht-sensitive äußere Metadaten, verwenden aber Formatversion 2 und enthalten den v2-Umschlag innerhalb der Verschlüsselung. `migrateV1ToV2` ist rein, deterministisch und klont die Eingabe. Bestehende unwrapped lokale Werte sowie v1-Backups bleiben lesbar. Unbekannte oder beschädigte Umschläge lösen einen kontrollierten Storage-Fehler aus; die Initialisierung bleibt gesperrt und schreibt keine leeren Ersatzdaten.

**Validierung und Tests:** Valibot validiert den Umschlag, vorhandene Domain-Guards validieren dessen Payload. Tests prüfen deterministische, nicht mutierende Migration, v1/v2-Lesen, unbekannte Versionen, beschädigte Umschläge sowie die bestehenden Backup-Regressionspfade.

**Verbleibende Risiken:** Der v2-Umschlag ist noch pro Persistenzwert, nicht atomar über die drei SQLite-Schlüssel. Feldgenaue Valibot-Schemas, Fehlercodes in der UI, Restore-Vorab-Sicherungen und eine explizite v2→v3-Domainmigration folgen separat.

**Folgearbeit:** Arbeitspaket 2.2 ist unten dokumentiert und abgeschlossen.

## Phase 2, Arbeitspaket 2.2: Domain-Schemas und koordinierte Backup-Validierung

**Problem und Risiko:** Ein gültiger Umschlag allein schützt nicht vor falsch typisierten oder unvollständigen verschachtelten Feldern. Besonders Vollbackups müssen Workspaces, Archiv und Schülerdaten als zusammengehörigen Zustand prüfen.

**Betroffene Dateien:** `src/infrastructure/validation/persistedData.ts`, `src/utils/storage.ts`, `src/utils/studentDatabase.ts`, `src/utils/archive.ts`, `src/utils/backup.ts` sowie Unit- und Regressionstests.

**Änderung:** Valibot-Schemas prüfen die Form von Exam, Workspace, Archiv und Schülerdaten einschließlich verschachtelter Punktwerte und Verschlüsselungscontainer. Bestehende semantische Guards ergänzen das um Referenz- und Eindeutigkeitsprüfungen. Die Valibot-Ausgabe wird nicht zum Re-Serialisieren verwendet; der validierte Originalwert bleibt erhalten, sodass diese Validierungsphase keine unbekannten Felder verwirft. Historische Archivfelder (`examId`, Fach, Kurs, Lehrkraft) bleiben zulässig und werden beim Laden aus dem Exam-Snapshot ergänzt. Vollbackups validieren nach der Normalisierung den gesamten Anwendungspayload.

**Validierung und Tests:** Neue Tests decken gültige und ungültige verschachtelte Punkte, Legacy-Archivmetadaten und den koordinierten Anwendungszustand ab. Der Regressionstest deckt zusätzlich den v2-Vollbackup-Roundtrip ab. Alle Testdaten sind fiktiv.

**Verbleibende Risiken:** Die Schemas beschreiben derzeit die unterstützte aktuelle Domainform; eine spätere neue Domainversion benötigt eine benannte v2→v3-Migration und Tests. Die lokale SQLite-Persistenz verwendet weiterhin drei getrennte Werte und ist noch keine atomare Gesamttransaktion. UI-Fehlercodes und Diagnoseexport folgen in der Fehlerbehandlungsphase.

**Nächster kleiner Schritt:** Phase 3, Arbeitspaket 3.1: Restore vor Überschreiben absichern (klare Bestätigung, lokale Vorab-Sicherung soweit verfügbar und nutzerfreundliche Fehlercodes), ohne die Entschlüsselungsalgorithmen zu verändern.

## Phase 3, Arbeitspaket 3.1: Sicherer Restore vor Überschreiben

**Problem und Risiko:** Ein importierter Vollbackup- oder Schülerdatenbankstand ersetzt bestehende lokale Daten. Der bisherige In-Memory-Rollback-Punkt schützt nicht gegen Browser-Neustart, und Fehler der Browser-Kryptografie waren nicht zuverlässig verständlich oder klassifizierbar.

**Betroffene Dateien:** `src/utils/backup.ts`, `src/App.tsx`, `src/components/ConfirmDialog.tsx`, Backup-Tests, README, Datenschutzdokumentation und Changelog.

**Änderung:** Überschreibende Wiederherstellungen verlangen eine Checkbox-Bestätigung. Der Dialog bietet „Vorher speichern und wiederherstellen“: Er exportiert zuerst ein verschlüsseltes Vollbackup des aktuellen Zustands und übernimmt den Import nur nach erfolgreichem Speichern. Der vorhandene In-Memory-Rollback-Punkt bleibt als zusätzliche kurzfristige Absicherung erhalten. `BackupValidationError` verwendet datensparsame Fehlercodes für Umschlag, Entschlüsselung, JSON, Schema und Payload. Die UI zeigt nur Nachricht und Code, nie Passwort, Schlüssel oder Nutzdaten.

**Browsergrenze:** Eine Web-App darf eine Datei nicht ohne Nutzerinteraktion an einem beliebigen Ort speichern. Deshalb wird die Vorab-Sicherung nicht still oder unverschlüsselt im Browser abgelegt, sondern über die sichtbare Dateiauswahl gespeichert. Das Passwort existiert nur während des offenen Dialogs im Arbeitsspeicher und wird beim Schließen oder Übernehmen geleert.

**Validierung und Tests:** Unit-Tests prüfen bekannte Umschlagversionen und den Fehlercode bei falschem Passwort. Die bestehende Regression prüft verschlüsselte v1/v2-Backups und Vollbackup-Roundtrips. Lint, Typecheck und Build laufen für das Arbeitspaket.

**Verbleibende Risiken:** Ein direkter Restore ohne Vorab-Sicherung ist weiterhin bewusst möglich, aber nur nach Checkbox-Bestätigung. Der Rollback-Punkt ist nicht neustartfest. Ein nutzerkontrollierter Diagnoseexport und umfassendere Fehlergrenzen gehören in ein späteres Fehlerbehandlungspaket.

**Nächster kleiner Schritt:** Arbeitspaket 3.2: Backup-Status global sichtbar machen und Zustände wie „noch nie gesichert“, „empfohlen“, „dringend“ und „letzter Versuch fehlgeschlagen“ fachlich trennen.

## Phase 3, Arbeitspaket 3.2: Globaler Backup-Status

**Problem und Risiko:** Der Sicherungsstand war bisher nur im Backup-Bereich sichtbar und unterschied nicht zuverlässig zwischen fehlender Sicherung, veralteter Sicherung und fehlgeschlagenem Export.

**Betroffene Dateien:** `src/utils/backup.ts`, `src/components/GlobalBackupStatus.tsx`, `src/App.tsx`, Backup-Tests sowie Datenschutz-, README- und Changelog-Dokumentation.

**Änderung:** Der Status erscheint jetzt oberhalb der Hauptnavigation auf jeder Ansicht und führt mit „Jetzt sichern“ zum Backup-Bereich. Fachlich getrennt sind: keine Schülerdaten, noch nie gesichert, aktuell, Sicherung empfohlen, Sicherung dringend empfohlen und letzter Sicherungsversuch fehlgeschlagen. Ein erfolgreicher Export speichert den Erfolg und löscht die Fehlermetadaten; ein fehlgeschlagener Export speichert ausschließlich Zeitstempel und generischen Fehlercode. Keine Schüler-, Klassen-, Bewertungs-, Kommentar-, Passwort- oder Schlüsselwerte gelangen in die Metadaten.

**Regeln:** Eine Sicherung ist aktuell, wenn sie den letzten Datenstand abdeckt und höchstens sieben Tage alt ist. Nach Datenänderungen oder nach sieben Tagen wird sie empfohlen; nach 30 Tagen dringend. Ein fehlgeschlagener Versuch hat Vorrang, damit eine falsche Entwarnung vermieden wird.

**Validierung und Tests:** Unit-Tests decken alle Statuszustände sowie generische Fehlermetadaten ab. Bestehende Backup- und Regressionstests bleiben aktiv. Die globale Darstellung verwendet nur Status- und Zeitinformationen.

**Verbleibende Risiken:** Der Export kann durch Browser- oder Betriebssystemdialoge abgebrochen werden; ein bewusster Abbruch gilt nicht als Fehler. Eine automatische Sicherung ohne Nutzeraktion ist weiterhin nicht vorgesehen, weil sie dem Local-first- und Nutzer-Kontrollprinzip widersprechen würde.

**Nächster kleiner Schritt:** Phase 4, Arbeitspaket 4.1: Statische Navigation und App-Shell risikoarm aus `App.tsx` extrahieren, ohne Routing-, State- oder Persistenzverhalten zu ändern.

## Phase 4, Arbeitspaket 4.1: App-Shell und Hauptnavigation extrahieren

**Problem und Risiko:** `App.tsx` enthielt selbst das äußere Seiten-Layout, die komplette Markup-Struktur der Hauptnavigation, statische Tabdefinitionen, Icons und ARIA-IDs. Diese Darstellung ist unabhängig von Persistenz und Fachlogik, berührt aber Tastatursteuerung, Fokusführung und die bestehende Archiv-Aktion.

**Betroffene Dateien:** `src/App.tsx`, `src/app/AppShell.tsx`, `src/app/AppNavigation.tsx`, `src/app/AppNavigation.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `AppShell` stellt ausschließlich die äußere Layoutgrenze bereit. `AppNavigation` enthält die statischen Tabs, Icons, stabilen ARIA-IDs und die vorhandene Aktion „Im Archiv speichern“. `App.tsx` behält den aktiven Tab, Refs, Tabulator-/Pfeiltastenlogik, Fokuswiederherstellung, den Archiv-Command sowie sämtliche Zustände, Persistenz- und Workflowlogik. Klicks wählen daher weiterhin direkt denselben State aus; die Tastatur ruft weiterhin den bestehenden Fokus-Command auf.

**Validierung und Tests:** Ein Unit-Test fixiert die Reihenfolge und die stabilen Tab-/Panel-IDs. Lint, Typecheck und die gesamte Vitest-Suite laufen nach der Extraktion. Der Release-Check baut zusätzlich Produktions- und Demo-Artefakte sowie den bestehenden Offline-Regressionslauf.

**Verbleibende Risiken:** Die neue Komponentenverbindung ist noch nicht mit einem Browser-Interaktionstest abgesichert; Playwright folgt erst mit der geplanten E2E-Infrastruktur. `App.tsx` bleibt bewusst der große Orchestrator. Es gab keine Änderung an Datenformat, Kryptografie, Offline-Strategie oder Commands.

**Nächster kleiner Schritt:** Arbeitspaket 4.2 könnte eine weitere reine Präsentationsgrenze (zum Beispiel Header-/Darstellungssteuerung) extrahieren. Fachworkflows, globale Zustände und Persistenz bleiben dabei weiterhin unangetastet.

## Phase 4, Arbeitspaket 4.2: Header und Darstellungssteuerung extrahieren

**Problem und Risiko:** Der App-Header enthielt neben seinem Layout die statische Liste der Darstellungsvarianten, Icons, Beschriftungen und Steuerungs-Markup. Obwohl er keine Fachdaten verarbeitet, darf eine Extraktion weder Theme-Persistenz, Fullscreen-Verhalten noch die Einführung verändern.

**Betroffene Dateien:** `src/App.tsx`, `src/app/AppHeader.tsx`, `src/app/AppHeader.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `AppHeader` rendert Titel, Schuljahr-Pille und die Steuerelemente für Darstellung, Hell-/Dunkelmodus, Vollbild und Hilfe. Die Komponente erhält nur die aktuellen Werte, Verfügbarkeitsinformation und bestehende Callbacks. `App.tsx` behält `theme`, `visualTheme`, `isAppFullscreen`, deren Speicher-Effekte, `toggleAppFullscreen` und `openUserGuide`. Die Auswahl der Darstellungsvarianten, Beschriftungen, `disabled`-Zustand und ARIA-/Title-Texte sind inhaltlich unverändert.

**Validierung und Tests:** Ein Unit-Test sichert die eindeutigen unterstützten Darstellungswerte, einschließlich des barrierefreien Themes. Lint, Typecheck und die gesamte Vitest-Suite laufen nach der Extraktion. Der Release-Check baut zusätzlich Produktions- und Demo-Artefakte sowie den bestehenden Offline-Regressionslauf.

**Verbleibende Risiken:** Die Header-Interaktionen sind noch nicht mit einem Browser-Interaktionstest abgedeckt; das gehört zur späteren React-Testing-Library-/Playwright-Infrastruktur. Es gibt keine Änderung an Datenformat, Verschlüsselung, Offline-Strategie oder Commands.

**Nächster kleiner Schritt:** Ein folgendes, separat beauftragtes Arbeitspaket kann eine weitere reine Darstellungsgrenze aus `App.tsx` wählen. Fachworkflows, State-Management und Persistenz bleiben bis dahin unverändert.

## Phase 4, Arbeitspaket 4.3: Globale Status- und Hinweisfläche extrahieren

**Problem und Risiko:** Der Bereich direkt unter dem Header verband die rein darstellende Backup-Statuskarte mit flüchtigen App-Hinweisen und dem sichtbaren Demo-Hinweis. Eine unvorsichtige Extraktion könnte den Wechsel zum Backup-Bereich, das Zurücksetzen der ausblendbaren Demo-Meldung oder den Demo-Reset verändern.

**Betroffene Dateien:** `src/App.tsx`, `src/app/AppStatusArea.tsx`, `src/app/AppStatusArea.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `AppStatusArea` rendert ausschließlich bereits berechnete Status- und Hinweiswerte: die vorhandene globale Backup-Karte, nicht-sensitive Laufzeitmeldungen und den Demo-Hinweis. Sie erhält den bestehenden Backup-Command und Demo-Reset als Callbacks. `App.tsx` behält die Backup-Statusberechnung, Meldungserzeugung, Demo-Daten und alle Befehle. Der Reset-Key der Demo-Meldung bleibt an die aktive Workspace-ID gebunden, sodass ein Workspacewechsel weiterhin eine zuvor geschlossene Meldung erneut zeigen kann.

**Validierung und Tests:** Ein Unit-Test sichert den stabilen, workspaceabhängigen Reset-Key. Lint, Typecheck und die gesamte Vitest-Suite laufen nach der Extraktion. Der Release-Check baut zusätzlich Produktions- und Demo-Artefakte sowie den bestehenden Offline-Regressionslauf.

**Verbleibende Risiken:** Hinweis- und Button-Interaktionen sind noch nicht durch Browser-E2E-Tests abgedeckt; dies gehört zur späteren React-Testing-Library-/Playwright-Infrastruktur. Es wurden keine Schülerdaten, Passwörter, Schlüssel, Persistenzformate, Kryptografie- oder Offline-Verhalten verändert.

**Nächster kleiner Schritt:** Ein weiteres, separat beauftragtes Arbeitspaket kann eine weitere reine Darstellungsgrenze oder ein einzelnes Modal extrahieren. Fachworkflows, State-Management und Persistenz bleiben bis dahin unverändert.

## Phase 4, Arbeitspaket 4.4: First-Run-Guide als Dialogansicht extrahieren

**Problem und Risiko:** Der First-Run-Guide ist ein abgegrenzter, mehrstufiger Dialog. Er enthält sichtbares Markup und statische Schritttexte, ist aber mit Fokusführung, Escape-/Tab-Tastaturbehandlung, dauerhafter Ausblendung und Hauptnavigation verbunden. Eine Extraktion darf seine Dialogsemantik oder den handlungsorientierten Einstieg nicht beeinträchtigen.

**Betroffene Dateien:** `src/App.tsx`, `src/app/FirstRunGuide.tsx`, `src/app/FirstRunGuide.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `FirstRunGuide` rendert das unveränderte Dialog-Markup und die statischen fünf Einstiegsschritte. `App.tsx` behält Öffnen/Schließen, den aktuellen Schritt, Fokus-Refs, Fokusfalle, Escape-Behandlung, die lokale Ausblend-Markierung und die Navigation zum gewählten Hauptbereich. Alle Buttons rufen weiterhin diese bestehenden Parent-Callbacks auf. Der Guide verlangt keine Daten und verarbeitet weder Schülerdaten noch Passwörter oder Schlüssel.

**Validierung und Tests:** Ein Unit-Test sichert die Reihenfolge der geführten lokalen Arbeitsschritte von Lerngruppe bis Backup. Lint, Typecheck und die gesamte Vitest-Suite laufen nach der Extraktion. Der Release-Check baut zusätzlich Produktions- und Demo-Artefakte sowie den bestehenden Offline-Regressionslauf.

**Verbleibende Risiken:** Dialogfokus und Tastaturinteraktionen sind noch nicht durch Browser-E2E-Tests abgedeckt; die Fokusimplementierung selbst ist unverändert und verbleibt in `App.tsx`. Es wurden keine Persistenzformate, Kryptografie-, Offline- oder Fachworkflow-Regeln verändert.

**Nächster kleiner Schritt:** Ein weiteres, separat beauftragtes Arbeitspaket kann eine weitere reine Darstellungsgrenze aus `App.tsx` wählen. State-Management, Persistenz und Fachworkflows bleiben bis dahin unverändert.

## Phase 4, Arbeitspaket 4.5: Speicher-Start- und Fehleransichten extrahieren

**Problem und Risiko:** Die beiden frühen Rückgabepfade für Speicherinitialisierung und Speicherfehler waren statisches Markup in `App.tsx`. Sie liegen an einer kritischen Sicherheitsgrenze: Bei einem Fehler darf die Anwendung keine Daten normal weiterverarbeiten oder den Nutzer über den Zustand des lokalen Speichers täuschen.

**Betroffene Dateien:** `src/App.tsx`, `src/app/AppStartupScreens.tsx`, `src/app/AppStartupScreens.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `StorageLoadingScreen` und `StorageUnavailableScreen` rendern die bestehenden Ansichten unverändert. `App.tsx` behält Speicherinitialisierung, Fehlerklassifizierung, `storageReady`, `storageError` und die Entscheidung über die Darstellung. Die Fehleransicht erhält nur die bereits aufbereitete Detailnachricht sowie den bestehenden Reload-Callback; sie greift nicht auf Daten, Passwort, Schlüssel oder Storage zu.

**Validierung und Tests:** Serverseitiges React-Rendering prüft die vorhandene `status`-/`aria-live`-Semantik der Ladeansicht sowie die Wiederherstellungsaktion der Fehleransicht. Lint, Typecheck und die gesamte Vitest-Suite laufen nach der Extraktion. Der Release-Check baut zusätzlich Produktions- und Demo-Artefakte sowie den bestehenden Offline-Regressionslauf.

**Verbleibende Risiken:** Der Initialisierungs- und Fehlerpfad ist noch nicht browserseitig gegen einen tatsächlich blockierten IndexedDB-/SQLite-Zugriff getestet. Seine Storage-Logik bleibt jedoch unverändert in `App.tsx`; es wurden keine Persistenzformate, Kryptografie-, Offline- oder Fachworkflow-Regeln verändert.

**Nächster kleiner Schritt:** Vor einer weiteren UI-Extraktion sollte entschieden werden, ob weiterhin ausschließlich Präsentationsgrenzen bearbeitet werden oder Phase 5 mit einem einzelnen fachlichen Controller beginnt. Beide Optionen benötigen einen separaten, klar abgegrenzten Auftrag.

## Phase 4, Arbeitspaket 4.6: Workspace-Versionskarte extrahieren

**Problem und Risiko:** Die Versionskarte im Workspace-Umschalter enthielt statisches Layout für aktuelle Klassenarbeit, lokale Schnappschüsse und Wiederherstellungsaktionen. Die Aktionen selbst sind jedoch Teil des Workspace-Workflows und dürfen nicht versehentlich in eine Präsentationskomponente wandern.

**Betroffene Dateien:** `src/App.tsx`, `src/app/WorkspaceVersionPanel.tsx`, `src/app/WorkspaceVersionPanel.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `WorkspaceVersionPanel` rendert die unveränderte Versionskarte, Zeitstempel, Zähler und Buttons. `App.tsx` behält den Auf-/Zuklappzustand, das Erzeugen eines Schnappschusses, das Öffnen des Wiederherstellungsdialogs, die Versionsobergrenze und sämtliche Workspace-Datenänderungen. Die neue Komponente erhält nur einen bereits ausgewählten Workspace sowie Callbacks.

**Validierung und Tests:** Serverseitiges React-Rendering prüft sowohl die zusammengeklappte Schnappschuss-Zusammenfassung als auch die sichtbare Wiederherstellungsaktion im aufgeklappten Zustand. Lint, Typecheck und die gesamte Vitest-Suite laufen nach der Extraktion. Der Release-Check baut zusätzlich Produktions- und Demo-Artefakte sowie den bestehenden Offline-Regressionslauf.

**Verbleibende Risiken:** Das Auslösen der Speichern-/Wiederherstellen-Callbacks ist noch nicht browserseitig getestet. Ihre Workflow- und Persistenzlogik ist unverändert in `App.tsx` verblieben; Datenformat, Kryptografie und Offline-Verhalten bleiben unverändert.

**Nächster kleiner Schritt:** Phase 5, Arbeitspaket 5.1: Einen eng begrenzten Workspace-Controller als Command-Fassade einführen, ohne Persistenzstrategie oder Datenformat zu ändern.

## Phase 5, Arbeitspaket 5.1: Controller für lokale Workspace-Versionen

**Problem und Risiko:** Die Commands für manuelle Workspace-Schnappschüsse und die Wiederherstellung einer älteren Version lagen in `App.tsx` neben UI-State, Persistenz-Effekten und weiteren Workspace-Commands. Das erschwert isolierte Tests und macht spätere fachliche Extraktionen riskanter. Wiederherstellung darf insbesondere den aktuellen Stand nicht verlieren.

**Betroffene Dateien:** `src/App.tsx`, `src/features/workspaces/useWorkspaceVersionController.ts`, `src/domain/workspaces/versions.ts`, `src/domain/workspaces/versions.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `useWorkspaceVersionController` stellt ausschließlich die Commands `saveVersion(workspaceId)` und `restoreVersion({ workspaceId, version })` bereit. Die reinen, nicht mutierenden Domain-Funktionen erstellen Snapshots, begrenzen die Versionsliste und stellen einen Snapshot wieder her, während sie den vorher aktuellen Stand als neue lokale Version erhalten. `App.tsx` bleibt Eigentümer von `DraftBundle`, der Persistenz-Effekte, der Versionsbaseline, dem Wiederherstellungsdialog und dem UI-State für eingeklappte Abschnitte. Datenformat und die maximale Anzahl lokaler Versionen bleiben unverändert.

**Validierung und Tests:** Domain-Tests prüfen das Klonen beim Erstellen eines Snapshots, die unveränderte Eingabe sowie Wiederherstellung mit Sicherung des vorherigen aktuellen Stands. Lint, Typecheck und die gesamte Vitest-Suite laufen nach der Umstellung. Der Release-Check baut zusätzlich Produktions- und Demo-Artefakte sowie den bestehenden Offline-Regressionslauf.

**Verbleibende Risiken:** Automatische Zeitintervall-Schnappschüsse, Workspace-Auswahl, Anlegen/Löschen und EWH-Änderungen verbleiben bewusst noch in `App.tsx`; sie folgen nur als getrennte Controller-Pakete. Die Controller-Callbacks sind noch nicht per Browser-E2E getestet. Keine Speicherstrategie, Migration, Verschlüsselungslogik oder Offline-Regel wurde verändert.

**Nächster kleiner Schritt:** Phase 5, Arbeitspaket 5.2 sollte entweder die reine Workspace-Auswahl oder das Anlegen/Löschen als separaten Controller extrahieren, nicht beides gleichzeitig.

## Kompatibilitätskorrektur: ältere lokale Archive lesbar halten

**Problem und Risiko:** Nach Einführung der Runtime-Validierung wurde ein Archiv-Snapshot vor seiner bestehenden Legacy-Normalisierung gegen das aktuelle vollständige Schema geprüft. Ältere, ansonsten gültige lokale Archive ohne später ergänzte Generator- oder Druckeinstellungen wurden dadurch abgewiesen. Die App blieb zwar korrekt gesperrt und überschieb keine Daten, war für betroffene Nutzer aber nicht mehr nutzbar.

**Betroffene Dateien:** `src/utils/storage.ts`, `src/utils/storage.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** Der Archiv-Ladepfad prüft zuerst nur die dokumentierte historische Mindestform eines Archiveintrags und seines Exam-Snapshots. Danach ergänzt `normalizeExamDraft` fehlende aktuelle Examfelder; erst der normalisierte Wert durchläuft die strenge Valibot-Validierung. Beschädigte Einträge ohne erforderliche Identifikations-, Zusammenfassungs- oder Examstruktur bleiben abgewiesen. Es gibt keine Schreibmigration und keine Überschreibung des gespeicherten Archivs während des Lesevorgangs.

**Validierung und Tests:** Ein Regressionstest lädt ein älteres Archiv ohne die späteren Generator- und `showWeightedOverview`-Felder und prüft die sichere Normalisierung der abgeleiteten Archiv- und Examwerte. Lint, Typecheck und die gesamte Vitest-Suite laufen anschließend; der Release-Check enthält zudem Offline-Regression und beide Builds.

**Verbleibende Risiken:** Diese Korrektur deckt die bekannte historische Archivform ab. Weitere sehr alte oder manuell veränderte Daten bleiben bewusst gesperrt, bis ihre Form anhand eines anonymisierten Beispiels oder eines verschlüsselten Backups nachvollziehbar geprüft werden kann. Die App darf solche Daten nicht stillschweigend ersetzen.

## Phase 5, Arbeitspaket 5.2: Controller für Workspace-Auswahl

**Problem und Risiko:** Die Auswahl einer Klassenarbeit war ein einzelner Command in `App.tsx`, der sowohl die aktive Workspace-ID setzte als auch die eingeklappten Editor-Abschnitte zurücksetzte. Diese kleine Zustandskopplung soll künftig als fachlich benannter Command verfügbar sein, ohne die bestehenden automatischen Auswahl-Fallbacks zu verändern.

**Betroffene Dateien:** `src/App.tsx`, `src/features/workspaces/useWorkspaceSelectionController.ts`, `src/domain/workspaces/selection.ts`, `src/domain/workspaces/selection.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `useWorkspaceSelectionController` bietet `selectWorkspace(workspaceId)`. Die reine Domain-Funktion erstellt einen neuen `DraftBundle` mit der angeforderten `activeWorkspaceId`, ohne Workspaces zu verändern oder die Eingabe zu mutieren. Der Controller setzt danach wie bisher eingeklappte Abschnitte zurück. Die in `App.tsx` vorhandenen Effekte für Gruppenwechsel und bevorzugte Workspaces bleiben unverändert zuständig für Fallbacks. Insbesondere wird eine unbekannte angeforderte ID nicht stillschweigend verworfen, weil der bestehende Fallback-Pfad diese Situation behandelt.

**Validierung und Tests:** Domain-Tests prüfen die nicht mutierende Auswahl, den unveränderten Workspace-Array und das bewusste Weiterreichen einer unbekannten ID an die vorhandenen Fallback-Regeln. Lint, Typecheck und die gesamte Vitest-Suite laufen nach der Umstellung. Der Release-Check baut zusätzlich Produktions- und Demo-Artefakte sowie den bestehenden Offline-Regressionslauf.

**Verbleibende Risiken:** Workspace-Anlegen, Löschen, Zuweisung zu Lerngruppen und automatische Intervall-Schnappschüsse verbleiben bewusst in `App.tsx`. Die neue Controller-Grenze ist noch nicht durch Browser-E2E-Interaktionen abgedeckt. Persistenzstrategie, Datenformat, Migrationen, Kryptografie und Offline-Regeln bleiben unverändert.

**Nächster kleiner Schritt:** Phase 5, Arbeitspaket 5.3 sollte ausschließlich Workspace-Anlegen und Löschen als zusammengehörige Lifecycle-Commands behandeln; Archivzuweisung und automatische Versionsbildung bleiben davon getrennt.

## Phase 5, Arbeitspaket 5.3: Controller für Workspace-Lifecycle

**Problem und Risiko:** Anlegen und Löschen einer Klassenarbeit änderten den Workspace-Bundle, die aktive Auswahl, die Versionsbaseline und die eingeklappten Editor-Abschnitte direkt in `App.tsx`. Ein Fehler beim Löschen könnte eine falsche aktive Klassenarbeit hinterlassen oder mehr Daten entfernen als bisher vorgesehen.

**Betroffene Dateien:** `src/App.tsx`, `src/features/workspaces/useWorkspaceLifecycleController.ts`, `src/domain/workspaces/lifecycle.ts`, `src/domain/workspaces/lifecycle.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `useWorkspaceLifecycleController` bietet `addWorkspace(exam, options)` und `removeWorkspace(workspaceId)`. Die reinen Domain-Funktionen erzeugen den nächsten Klassenarbeitsnamen, fügen den neuen Workspace als aktiv ein und wählen beim Löschen einer aktiven Klassenarbeit den vorherigen verbleibenden Workspace. Der letzte Workspace wird wie bisher nicht gelöscht. Der Controller aktualisiert weiterhin nur die Versionsbaseline des betroffenen Workspace und setzt eingeklappte Abschnitte zurück. Lerngruppen, Bewertungen, Archive und Datenbank-Persistenz werden durch diesen Controller nicht verändert.

**Validierung und Tests:** Domain-Tests prüfen nicht mutierendes Hinzufügen, die aktive Auswahl, die Auswahl des vorherigen Workspaces nach dem Löschen sowie den Schutz des letzten Workspaces. Lint, Typecheck und die gesamte Vitest-Suite laufen nach der Umstellung. Der Release-Check baut zusätzlich Produktions- und Demo-Artefakte sowie den bestehenden Offline-Regressionslauf.

**Verbleibende Risiken:** Die bestätigende Löschoberfläche, Archivzuweisung, EWH-Anlegen über den Guided Builder und automatische Intervall-Schnappschüsse bleiben bewusst in `App.tsx`. Workspace-Löschen entfernt weiterhin nur den Workspace aus dem Bundle; diese bestehende Semantik für zugehörige Bewertungsdaten wurde nicht verändert. Die Controller-Interaktionen sind noch nicht per Browser-E2E getestet. Datenformat, Migrationen, Kryptografie und Offline-Regeln bleiben unverändert.

**Nächster kleiner Schritt:** Phase 5, Arbeitspaket 5.4 kann die Zuweisung eines bestehenden Workspaces zu Archiv-/Lerngruppenkontexten separat behandeln. Alternativ kann vor weiteren Controllern die E2E-Grundlage priorisiert werden.

## Phase 5, Arbeitspaket 5.4: Controller für Workspace-Kontext

**Problem und Risiko:** Das Zuordnen des aktuell sichtbaren Workspace zu einem Archiv-Eintrag oder einer Lerngruppe bestand aus zwei kleinen, aber mehrfach verwendeten State-Commands in `App.tsx`. Eine fehlerhafte Extraktion könnte den falschen, aufgrund eines Filters sichtbaren Workspace ändern.

**Betroffene Dateien:** `src/App.tsx`, `src/features/workspaces/useWorkspaceContextController.ts`, `src/domain/workspaces/context.ts`, `src/domain/workspaces/context.test.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `useWorkspaceContextController` aktualisiert nur `activeArchiveEntryId` oder `assignedGroupId` des bereits aufgelösten aktiven Workspace. Der reine Domain-Übergang verändert weder Exam, Versionsliste noch andere Workspaces und ist ohne aktiven Workspace ein No-op. Prüfung einer Ziel-Lerngruppe, Archiv-Import/-Export, Navigation und EWH-Erzeugung bleiben in `App.tsx`.

**Validierung und Tests:** Domain-Tests prüfen beide Referenzen, die Unverändertheit anderer Workspaces und den No-op ohne aktiven Workspace. Lint, Typecheck und die gesamte Vitest-Suite laufen nach der Umstellung. Der Release-Check baut zusätzlich Produktions- und Demo-Artefakte sowie den bestehenden Offline-Regressionslauf.

**Verbleibende Risiken:** Die gemeinsam verwendeten Kontext-Commands sind noch nicht durch einen fachlichen E2E-Pfad mit Archiv und Lerngruppe abgedeckt. Datenformat, Migrationen, Verschlüsselung und Offline-Regeln bleiben unverändert.

## E2E-Grundlage: lokaler Demo-Smoke-Test

**Problem und Risiko:** Die bisherigen Tests konnten das Zusammenspiel aus Browser, IndexedDB, Service-Assets und UI nicht abdecken. Ohne einen stabilen, lokalen Smoke-Test kann eine Änderung die Startfähigkeit der Demo beschädigen, obwohl Unit-Tests bestehen.

**Betroffene Dateien:** `package.json`, `package-lock.json`, `playwright.config.ts`, `e2e/demo-smoke.spec.ts`, `.github/workflows/deploy-demo.yml`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** `@playwright/test` ergänzt den separaten Befehl `npm run test:e2e`. Playwright startet einen lokalen Vite-Server und öffnet die fiktive Demo in einem frischen Browserkontext. Der Test prüft Start, Demo-Hinweis, die vorhandene Onboarding-Schließaktion und Hauptnavigation. Er protokolliert jede HTTP(S)-Anfrage außerhalb des lokalen Vite-Origin und erwartet keine externen Requests. CI installiert Chromium und führt den Test vor dem Pages-Artefakt aus; bei Fehlschlag werden Playwright-Diagnosen als Artefakt bereitgestellt.

**Validierung und Tests:** Der Chromium-E2E-Test lief lokal erfolgreich. Lint, Typecheck, Unit-Tests, Offline-Regression sowie Produktions- und Demo-Build werden zusätzlich ausgeführt. Testdaten sind ausschließlich die vorhandenen fiktiven Demo-Daten.

**Verbleibende Risiken:** Der erste E2E-Test deckt absichtlich nur einen Startpfad ab. Bewertungs-, Backup-/Restore-, Fehler- und Migrationspfade folgen als einzelne Tests. In CI benötigt Playwright einen Browserdownload; diese explizite Abhängigkeit ist dokumentiert und wird nur für Tests verwendet.

**Nächster kleiner Schritt:** Einen einzelnen kritischen E2E-Pfad mit Lerngruppe, Workspace-Zuweisung und Reload-Persistenz hinzufügen, bevor weitere Workspace-Controller folgen.

## E2E-Paket: Lerngruppe, Workspace-Zuweisung und Reload-Persistenz

**Problem und Risiko:** Eine lokale Anwendung muss zeigen, dass eine neue Lerngruppe und die Zuordnung einer archivierten Klassenarbeit nicht nur im React-State erscheinen, sondern nach einem Browser-Reload aus der lokalen Datenhaltung wieder verfügbar sind. Dieser Pfad berührt Lerngruppen, Archive, Workspace-Lifecycle, Kontextreferenzen und IndexedDB.

**Betroffene Dateien:** `e2e/workspace-assignment-persistence.spec.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** Der neue Playwright-Test startet mit frischen fiktiven Demo-Daten, speichert den Demo-EWH im Archiv, legt eine geschützte Test-Lerngruppe mit einem ausschließlich für den Test verwendeten Passwort an und weist dieser Lerngruppe eine Archivkopie zu. Nach einem Reload öffnet der Test das Archiv erneut und prüft die weiterhin sichtbare Gruppen-Zuordnung. Der Test verwendet keine Namen, echten Schülerdaten oder externen Dienste.

**Validierung und Tests:** Beide Chromium-E2E-Tests laufen lokal erfolgreich: der lokale Demo-Smoke-Test sowie der neue Persistenzpfad. Lint, Typecheck, Unit-Tests, Offline-Regression sowie Produktions- und Demo-Build werden zusätzlich ausgeführt.

**Verbleibende Risiken:** Der Pfad deckt noch keine Schülerbewertung, Backup/Restore, falsche Passwörter, beschädigte Backups oder explizite Migrationen ab. Der Test prüft eine erfolgreiche, nicht eine unterbrochene IndexedDB-Schreiboperation.

**Nächster kleiner Schritt:** Einen einzelnen E2E-Pfad für Backup-Erstellung, falsches Passwort und sicheren Restore ergänzen, bevor weitere Controller-Pakete folgen.

## E2E-Paket: verschlüsseltes Vollbackup und bestätigte Wiederherstellung

**Problem und Risiko:** Backup und Restore sind für eine Local-first-Anwendung der zentrale Schutz gegen Datenverlust. Ein browserseitiger Test muss daher den tatsächlichen Dateidownload, die Passwortprüfung und den ausdrücklichen Schutz vor dem Überschreiben bestehender Daten abdecken.

**Betroffene Dateien:** `e2e/backup-restore.spec.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** Der Playwright-Test erstellt aus fiktiven Demo-Daten ein verschlüsseltes Vollbackup und verwendet die heruntergeladene Datei anschließend im normalen Dateiauswahlpfad. Ein falsches Passwort muss den datensparsamen Fehlercode `BACKUP_DECRYPT_FAILED` zeigen. Mit dem korrekten Passwort öffnet sich der Wiederherstellungsdialog; der Button zum Ersetzen bleibt bis zur expliziten Checkbox-Bestätigung deaktiviert. Erst danach wird die vorhandene lokale Demodatenbasis ersetzt und der Erfolgshinweis geprüft. Der Test nutzt keine echten Personen- oder Schülerdaten.

**Validierung und Tests:** Der neue Chromium-E2E-Test wird zusammen mit den bestehenden lokalen Browserpfaden ausgeführt. Lint, Typecheck, Unit-Tests, Offline-Regression sowie Produktions- und Demo-Build bleiben verpflichtend.

**Verbleibende Risiken:** Beschädigte oder unvollständige Dateien, unbekannte Backup-Schemaversionen, der optionale Dateidownload der Vorab-Sicherung und Migrationsbackups sind bewusst separate Fehlerpfade und noch nicht browserseitig abgedeckt. Die bestehenden Unit-Tests bleiben dafür maßgeblich; weitere E2E-Fälle müssen einzeln ergänzt werden.

**Nächster kleiner Schritt:** Einen separaten E2E-Fehlerpfad für beschädigte und nicht unterstützte Backup-Dateien ergänzen oder mit einem eng begrenzten fachlichen Controller-Paket in Phase 5 fortfahren.

## E2E-Paket: beschädigte und nicht unterstützte Backup-Dateien

**Problem und Risiko:** Ein Restore darf ungültige Inhalte nicht in einen Vorschau- oder Überschreibpfad übernehmen. Fehler müssen verständlich bleiben und keine lokalen Daten ändern.

**Betroffene Dateien:** `e2e/backup-invalid-file.spec.ts`, `CHANGELOG.md` und diese Dokumentation.

**Änderung:** Ein Browser-Test importiert zuerst eine absichtlich beschädigte JSON-Datei und erwartet den datensparsamen Fehlercode `BACKUP_UNEXPECTED`. Danach importiert er eine formal vollständige, aber unbekannte zukünftige Backup-Formatversion (`999`) und erwartet den sicheren Abbruch. In beiden Fällen darf kein Wiederherstellungsdialog entstehen.

**Validierung und Tests:** Der Test verwendet ausschließlich im Speicher erzeugte, fiktive Dateiinhalte und läuft mit der vollständigen lokalen Playwright-Suite.

**Verbleibende Risiken:** Die browserseitige Abdeckung für verschlüsselte Backups mit unbekannter innerer Schema-Version und für das optionale Vorab-Backup folgt separat; deren Parsergrenzen sind bereits durch Unit-Tests abgedeckt.
