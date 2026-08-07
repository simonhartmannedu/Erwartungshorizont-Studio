# Mitwirken

Cool, dass du an Erwartungshorizont-Studio mitarbeiten willst. Beiträge sollen die lokale, datensparsame Nutzung stärken und bestehende Daten nicht gefährden.

## Vor einer Änderung

1. Beschreibe Problem, betroffene Dateien, Risiko und erwartetes Verhalten.
2. Führe mindestens `npm run lint`, `npm run typecheck`, `npm run test` und `npm run build` aus.
3. Ergänze für Fachlogik und Fehlerfälle passende Tests mit ausschließlich fiktiven Daten.
4. Aktualisiere die Doku, wenn Daten, Sicherheitsgrenzen, Backup/Wiederherstellung, Import/Export oder Bedienung betroffen sind.

Vermeide globale Formatierungsänderungen, unnötige Abhängigkeiten, komplette Refactorings und Änderungen mehrerer unabhängiger Workflows auf einmal.

## Daten- und Sicherheitsregeln

- Packe keine echten Schülerdaten, Namen, Bewertungen, Kommentare, Passwörter, Schlüssel oder Backups in Issues, Commits, Tests oder Screenshots.
- Änderungen an Storage, Migrationen, Kryptografie, Backup oder Wiederherstellung brauchen negative Tests, eine Rückwärtskompatibilitätsbeschreibung und Review.
- Beschreibe für neue Datenfelder Speicher-, Import/Export-, Backup/Wiederherstellungs- und Löschverhalten.
- Füge keine Telemetrie, Tracker oder externen Fehlerdienste ohne klaren, dokumentierten Auftrag hinzu.

## Coding Standards

- Verwende TypeScript und bestehende UI-Primitiven.
- Halte reine Fachlogik außerhalb von React-Komponenten und bevorzuge Commands vor beliebigen Settern.
- Verschlechtere nicht die Barrierefreiheit: Achte auf Tastatur, Labels, Fokus und Kontraste.
- Bewahre bestehendes Verhalten, wenn ein Ticket keine Änderung verlangt.
- Das Projekt verwendet keine Datei-für-Datei-Lizenzheader. Der gemeinsame Lizenznachweis besteht aus `LICENSE`, `NOTICE`, Paketmetadaten und dem sichtbaren App-Footer. Neue externe oder abweichend lizenzierte Dateien brauchen ihren eigenen Hinweis.

## Entwicklungsworkflow

Arbeite in kleinen, fachlich klaren Änderungen. Beschreibe Problem, Risiko, Testnachweis und verbleibende Grenzen. Änderungen an Storage, Migrationen, Kryptografie, Backup oder Wiederherstellung brauchen zusätzlich einen Kompatibilitätsnachweis und mindestens einen negativen Test. Rebase oder formatiere nicht großflächig ohne fachlichen Grund.

## Herkunft von Beiträgen und AGPL-3.0

Der Community-Kern ist unter `AGPL-3.0-only` lizenziert. Beiträge reichst du unter derselben Lizenz ein. Statt einer separaten Beitragsvereinbarung verwenden wir den Developer Certificate of Origin (DCO). Bestätige deine Berechtigung mit:

```text
Signed-off-by: Name <email>
```

Ein Commit mit dieser Zeile bestätigt, dass du den Beitrag unter der geltenden Projektlizenz einreichen darfst. Das ist keine Rechtsberatung.
