# Erwartungshorizont-Studio

Eine lokale Browser-Anwendung für Lehrkräfte: Erwartungshorizonte erstellen, Lerngruppen organisieren, korrigieren, bewerten, archivieren und Berichte exportieren.

[Demo öffnen](https://simonhartmannedu.github.io/Erwartungshorizont-Studio/) · [Modernisierungsplan](docs/modernization-plan.md) · [Architektur](docs/architecture.md)

![Screenshot von Erwartungshorizont-Studio](erwartungshorizontstudio.png)

## Hauptfunktionen

- Erwartungshorizonte, Aufgaben, Punkte und Notenschlüssel erstellen und wiederverwenden.
- Lerngruppen lokal anlegen oder aus CSV/XLSX/ODS importieren.
- Punkte, Kommentare und Signaturen pro Schüler verwalten.
- Korrekturen, Berichte und lokale Exporte (PDF, DOCX, XLSX, ODS, CSV und Druck) erstellen.
- Erwartungshorizonte und Schuljahre archivieren.
- Verschlüsselte lokale Backups erstellen und wiederherstellen.
- Ausschließlich fiktive Demo-Daten nutzen.

## Local-first und Datenschutz

Ihre Schülerdaten verlassen dieses Gerät nicht. Es gibt kein verpflichtendes Benutzerkonto und keine zentrale Schülerdatenbank.

Die Daten liegen in diesem Browser. Erstellen Sie deshalb regelmäßig eine verschlüsselte Sicherung. Browserprofil-Löschung, privates Surfen, Speicherbereinigung oder ein Gerätewechsel können lokale Daten entfernen.

Die Anwendung unterstützt eine datensparsame, lokale Verarbeitung. Die datenschutzrechtliche Bewertung hängt vom konkreten schulischen Einsatz ab. Details enthält [Daten und Datenschutz](docs/data-and-privacy.md).

## Open Core und AGPL-3.0

EWH-Studio ist Open Core. Der gesamte lokale Community-Kern steht unter der [AGPL-3.0](LICENSE). Lehrkräfte können sämtliche Kernfunktionen kostenlos, lokal und ohne Cloud nutzen.

**AGPL bedeutet:** Sie dürfen den Community-Kern nutzen, untersuchen, ändern und weitergeben. Wer eine geänderte Version weitergibt, muss den entsprechenden Quellcode unter der AGPL bereitstellen. Wird eine geänderte Version als Netzwerkdienst angeboten, muss den Nutzenden dieses Dienstes ebenfalls der entsprechende Quellcode zugänglich sein.

**Open Core bedeutet hier:** Der lokale Community-Kern bleibt vollständig nutzbar und benötigt keine kommerziellen Module. Spätere kommerzielle Erweiterungen dürften den Kern nur über dokumentierte Schnittstellen ergänzen, niemals Datenzugriff, Backup, Restore oder lokale Korrektur einschränken.

- **Nutzer** dürfen den Kern kostenlos einsetzen, kopieren, anpassen und weitergeben – unter den Bedingungen der AGPL.
- **Entwickler** dürfen beitragen und Forks veröffentlichen; Änderungen am abgeleiteten Kern bleiben bei Weitergabe unter AGPL.
- **Schulen** dürfen den Kern selbst betreiben, anpassen und auch kommerzielle Dienstleister beauftragen. Ein verpflichtender Cloud- oder Kontozwang entsteht dadurch nicht.

Details, Grenzen und keine Rechtsberatung: [Lizenzierung](docs/licensing.md), [Open-Core-Abgrenzung](docs/open-core.md), [Open-Core-Roadmap](docs/open-core-roadmap.md).

## Entwicklungsstatus

Die Anwendung wird schrittweise modernisiert. Kritische Daten-, Sicherheits- und Korrekturabläufe werden durch automatisierte Tests, Dokumentation und Reviews abgesichert. Die geplanten Etappen stehen im [Modernisierungsplan](docs/modernization-plan.md).

## Installation und Entwicklung

Voraussetzungen: Node.js 24 oder eine mit Vite 6 kompatible Node-Version sowie npm.

```bash
npm install
npm run dev
```

Wichtige Befehle:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run test:e2e
npm run test:regression
npm run build
npm run build:demo
npm run check:release
```

`npm run check:release` führt Lint, Typecheck, Unit-Tests, Offline-Regression und Produktions-Build aus. `npm run test:e2e` prüft kritische Browserpfade lokal mit Playwright.

## Datenhaltung, Backup und Wiederherstellung

Arbeitsstände, Archive und die Schülerdatenbank liegen als browserlokale SQLite-Datenbank (`sql.js`) in IndexedDB. Theme-Einstellungen liegen in `localStorage`. Es gibt keinen Synchronisationsserver.

Vollbackups sind verschlüsselte JSON-Dateien. Das beim Export gewählte Passwort wird nicht gespeichert. Vor einer Wiederherstellung bestehender Daten ist eine explizite Bestätigung erforderlich; optional kann vorher eine zusätzliche verschlüsselte Sicherung erstellt werden.

## Sicherheit

Geschützte Gruppen und Backups verwenden Browser-Kryptografie. Entschlüsselte Daten liegen während einer aktiven Sitzung im Browser-Arbeitsspeicher vor. Bei gemeinsam genutzten Geräten sollten Gruppen nach der Korrektur gesperrt, der Browser geschlossen und regelmäßig verschlüsselte Backups erstellt werden. Sicherheitslücken bitte gemäß [SECURITY.md](SECURITY.md) vertraulich melden.

## Mitwirken

Beiträge sind willkommen. Bitte beachten Sie [CONTRIBUTING.md](CONTRIBUTING.md), den [Code of Conduct](CODE_OF_CONDUCT.md) und die [Sicherheitsrichtlinie](SECURITY.md). Echte Schülerdaten gehören niemals in Issues, Pull Requests, Screenshots oder Tests.

## Dokumentation

- [Architektur](docs/architecture.md)
- [Daten und Datenschutz](docs/data-and-privacy.md)
- [Entwicklerhandbuch](docs/developer-guide.md)
- [Modernisierungsplan](docs/modernization-plan.md)
- [Lizenzierung](docs/licensing.md)
- [Open Core](docs/open-core.md)
- [GitHub-Labels](docs/github-labels.md)

## Lizenz

Der Community-Kern ist unter [GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`) lizenziert. Die Lizenz gilt nicht automatisch für Marken oder separat gekennzeichnete Drittinhalte. Siehe [NOTICE](NOTICE) und [docs/licensing.md](docs/licensing.md).
