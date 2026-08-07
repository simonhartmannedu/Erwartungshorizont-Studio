# Änderungsprotokoll

Dieses Projekt verwendet [Semantic Versioning](https://semver.org/).

## Noch nicht veröffentlicht

- PDF-Import verlangt die Einwilligung vor der Dateiauswahl; Uploads sind auf 8 MB begrenzt.
- Der lokale PDF-Dienst begrenzt Anfragegröße, Parallelität und Laufzeit externer PDF-Werkzeuge.
- Die lokale Speicherung erkennt konkurrierende Tabs und verhindert das Überschreiben eines neueren Datenstands.
- README und Wartungsdokumentation wurden für Lehrkräfte und eine Einzelwartung vereinfacht und eingedeutscht.

## 0.5.0 – 06.08.2026

- Linting, Typprüfung, Unit-, Regression- und Browser-Tests ergänzt.
- Versionierte Speicher- und Backupformate mit Migrationen und Validierung eingeführt.
- Verschlüsselte Backups, kontrollierte Wiederherstellung und Backup-Status ergänzt.
- Lokale Fachlogik und Workspace-Controller klarer getrennt.
- AGPL-3.0-only, Sicherheitsrichtlinie und Hinweise zu Drittmaterial ergänzt.

### Bekannte Grenze

Für `xlsx@0.18.5` bestehen bekannte Upstream-Sicherheitshinweise ohne automatisch kompatible Korrektur. Vor einem Release bitte prüfen.
