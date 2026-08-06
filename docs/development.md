# Entwicklung

## Voraussetzungen und Start

Node.js 24 und npm installieren, dann `npm ci` und `npm run dev` ausführen. Die Anwendung ist Local-first; Tests verwenden nur fiktive Daten.

## Qualitätsbefehle

`npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run test:regression` und `npm run build` sind die maßgeblichen Prüfungen. Vor einem Pull Request mindestens Lint, Typecheck, Unit-Tests und Build ausführen.

## Datenkritische Änderungen

Storage, Migration, Backup, Restore, Import, Export und Kryptografie benötigen einen kleinen isolierten Pull Request, einen Fehlpfadtest, eine Rückwärtskompatibilitätsbeschreibung und aktualisierte Dokumentation. Keine echten Schülerdaten, Passwörter, Schlüssel oder Backups committen.

## Release

Das Projekt verwendet Semantic Versioning. Ein Tag `vX.Y.Z` löst den Release-Workflow aus; er prüft den gleichlautenden Abschnitt in [CHANGELOG.md](../CHANGELOG.md) und erstellt daraus GitHub-Release-Notizen. Vor `1.0.0` sind Vorabversionen zu bevorzugen, solange Datenformate noch nicht stabil sind.
