# Mitwirken

Vielen Dank für Ihr Interesse an Erwartungshorizont-Studio. Beiträge sollen die lokale, datensparsame Nutzung stärken und dürfen bestehende Daten nicht gefährden.

## Vor einem Pull Request

1. Beschreiben Sie Problem, betroffene Dateien, Risiko und erwartetes Verhalten.
2. Führen Sie mindestens `npm run lint`, `npm run typecheck`, `npm run test` und `npm run build` aus.
3. Fügen Sie für Fachlogik und Fehlerfälle passende Tests mit ausschließlich fiktiven Daten hinzu.
4. Aktualisieren Sie Dokumentation, wenn Daten, Sicherheitsgrenzen, Backup/Restore, Import/Export oder Bedienung betroffen sind.

Bitte vermeiden Sie globale Formatierungsänderungen, unnötige Abhängigkeiten, vollständige Refactorings und Änderungen mehrerer unabhängiger Workflows in einem Pull Request.

## Daten- und Sicherheitsregeln

- Keine echten Schülerdaten, Namen, Bewertungen, Kommentare, Passwörter, Schlüssel oder Backups in Issues, Commits, Tests oder Screenshots.
- Änderungen an Storage, Migrationen, Crypto, Backup oder Restore benötigen negative Tests, eine Rückwärtskompatibilitätsbeschreibung und Review.
- Neue Datenfelder müssen Speicher-, Import/Export-, Backup/Restore- und Löschverhalten beschreiben.
- Keine Telemetrie, Tracker oder externe Fehlerdienste ohne separaten, ausdrücklich dokumentierten Auftrag.

## Coding Standards

- TypeScript und bestehende UI-Primitiven verwenden.
- Reine Fachlogik außerhalb von React-Komponenten halten und Commands gegenüber beliebigen Settern bevorzugen.
- Accessibility nicht verschlechtern: Tastatur, Labels, Fokus und Kontraste beachten.
- Bestehendes Verhalten bewahren, sofern ein Ticket keine Änderung verlangt.
- Das bestehende Projekt verwendet keine Datei-für-Datei-Lizenzheader. Um keine hunderten Quelldateien und generierten Dateien mechanisch zu verändern, ist der einheitliche Lizenznachweis `LICENSE`, `NOTICE`, Paketmetadaten und der sichtbare App-Footer. Neue externe oder abweichend lizenzierte Dateien müssen ihren eigenen Hinweis tragen.

## Entwicklungsworkflow und Pull Requests

Arbeiten Sie in kleinen, fachlich klaren Pull Requests. Beschreiben Sie Problem, Risiko, Testnachweis und verbleibende Grenzen. Änderungen an Storage, Migrationen, Crypto, Backup oder Restore brauchen zusätzlich einen Kompatibilitätsnachweis und mindestens einen negativen Test. Rebasen oder formatieren Sie nicht großflächig ohne fachlichen Grund.

## DCO und AGPL-3.0

Der Community-Kern ist unter `AGPL-3.0-only` lizenziert. Beiträge werden unter derselben Lizenz eingereicht. Statt eines Contributor License Agreements verwenden wir einen Developer Certificate of Origin (DCO). Bestätigen Sie die Berechtigung zur Einreichung mit:

```text
Signed-off-by: Name <email>
```

Ein Commit mit dieser Zeile bestätigt, dass Sie den Beitrag unter der geltenden Projektlizenz einreichen dürfen. Dies ist keine Rechtsberatung. Die Open-Core-Grenzen stehen in [docs/open-core.md](docs/open-core.md).
